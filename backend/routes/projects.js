const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// Get all projects for a user (owned + shared)
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { 'members.user': req.userId }
      ]
    })
      .populate('owner', 'name email')
      .populate('members.user', 'name email')
      .sort('-createdAt');

    const ownedProjects = projects.filter(p => p.owner._id.toString() === req.userId);
    const sharedProjects = projects.filter(p => p.owner._id.toString() !== req.userId);

    res.json({
      owned: ownedProjects,
      shared: sharedProjects,
      total: projects.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;

    const project = new Project({
      name,
      description,
      owner: req.userId,
      members: [{ user: req.userId, role: 'admin' }]
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project (with access check)
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('members.user', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const hasAccess = project.owner._id.toString() === req.userId ||
      project.members.some(m => m.user && m.user._id.toString() === req.userId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this project' });
    }

    let userRole = 'owner';
    if (project.owner._id.toString() !== req.userId) {
      const member = project.members.find(m => m.user && m.user._id.toString() === req.userId);
      userRole = member ? member.role : 'none';
    }

    res.json({
      ...project.toObject(),
      userRole
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start video call in a project (Admin/Owner only)
router.post('/:id/call/start', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Auth check: Must be owner or member with admin role
    const isOwner = project.owner.toString() === req.userId;
    const member = project.members.find(m => m.user && m.user.toString() === req.userId);
    const isAdmin = member && member.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only project owners or admins can start video calls' });
    }

    // Set active call
    const roomName = `devcollab-hub-proj-${project._id}`;
    project.activeCall = {
      host: req.userId,
      roomName,
      startedAt: new Date()
    };

    await project.save();

    // Broadcast call start via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${project._id}`).emit('call-started', {
        projectId: project._id,
        activeCall: project.activeCall
      });
    }

    res.json(project.activeCall);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End video call in a project (Owner, Admin or host of call only)
router.post('/:id/call/end', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!project.activeCall || !project.activeCall.roomName) {
      return res.status(400).json({ error: 'No active call in this project' });
    }

    // Auth check: Must be owner, admin or the host who started the call
    const isOwner = project.owner.toString() === req.userId;
    const member = project.members.find(m => m.user && m.user.toString() === req.userId);
    const isAdmin = member && member.role === 'admin';
    const isHost = project.activeCall.host && project.activeCall.host.toString() === req.userId;

    if (!isOwner && !isAdmin && !isHost) {
      return res.status(403).json({ error: 'You do not have permission to end this call' });
    }

    // Clear active call
    project.activeCall = null;
    await project.save();

    // Broadcast call end via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${project._id}`).emit('call-ended', {
        projectId: project._id
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;