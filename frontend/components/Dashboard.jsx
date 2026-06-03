import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { PlusIcon, FolderIcon, ArrowRightOnRectangleIcon, ChartBarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import NotificationBell from './NotificationBell';
import DarkModeToggle from './DarkModeToggle';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function Dashboard({ token, setToken }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [ownedProjects, setOwnedProjects] = useState([]);
  const [sharedProjects, setSharedProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const socketRef = useRef(null);
  const navigate = useNavigate();
  
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get('/api/analytics/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    fetchProjects();
    fetchAnalytics();
  }, [fetchAnalytics]);
  
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || undefined;
    socketRef.current = io(socketUrl, { path: '/socket.io' });

    socketRef.current.on('dashboard-update', () => {
      fetchAnalytics();
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [fetchAnalytics]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOwnedProjects(res.data.owned || []);
      setSharedProjects(res.data.shared || []);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const inviteToProject = async (projectId) => {
    const email = prompt('Enter email address to invite:');
    if (!email) return;
    try {
      await axios.post(`/api/invitations/project/${projectId}/invite`, { email }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Invitation sent to ${email}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invitation');
    }
  };
  
  const createProject = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/projects', newProject, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
      toast.success('Project created successfully!');
    } catch (err) {
      toast.error('Failed to create project');
    }
  };
  
  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Logged out successfully');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  const priorityData = analytics && {
    labels: ['Low', 'Medium', 'High', 'Urgent'],
    datasets: [{
      data: [analytics.tasksByPriority.low, analytics.tasksByPriority.medium, analytics.tasksByPriority.high, analytics.tasksByPriority.urgent],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      borderWidth: 0,
    }],
  };
  
  const statusData = analytics && {
    labels: ['To Do', 'In Progress', 'Review', 'Done'],
    datasets: [{
      label: 'Tasks',
      data: [analytics.todoTasks, analytics.inProgressTasks, analytics.reviewTasks, analytics.completedTasks],
      backgroundColor: '#3B82F6',
    }],
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              DevCollab Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Manage and collaborate on your workspaces</p>
            {user && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-slate-800 w-fit shadow-sm">
                <span className="font-semibold text-blue-600 dark:text-blue-400">👤 {user.name}</span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span>{user.email}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <NotificationBell token={token} />
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-5 py-2.5 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
        
        {/* Analytics Dashboard */}
        {analytics && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Analytics Overview</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{analytics.completionRate}%</p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${analytics.completionRate}%` }} />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{analytics.totalTasks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.inProgressTasks}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{analytics.overdueTasks}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold mb-4 text-gray-800 dark:text-white">Tasks by Priority</h3>
                <div className="h-64">
                  <Doughnut data={priorityData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold mb-4 text-gray-800 dark:text-white">Task Status Distribution</h3>
                <div className="h-64">
                  <Bar data={statusData} options={{ maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Create Project Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            <PlusIcon className="h-5 w-5" />
            New Project
          </button>
        </div>
        
        {/* Projects Grid */}
        {ownedProjects.length === 0 && sharedProjects.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
            <FolderIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No projects yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Create your first project to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <FolderIcon className="h-6 w-6 text-blue-600" />
                Your Projects
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ownedProjects.map((project) => (
                  <div
                    key={project._id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <FolderIcon className="h-10 w-10 text-blue-500" />
                      <span className="text-xs text-gray-400">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{project.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => navigate(`/project/${project._id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                      >
                        View Project →
                      </button>
                      <button
                        onClick={() => inviteToProject(project._id)}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {sharedProjects.length > 0 && (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <UserGroupIcon className="h-6 w-6 text-green-600" />
                  Shared With You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sharedProjects.map((project) => (
                    <div
                      key={project._id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <FolderIcon className="h-10 w-10 text-blue-500" />
                        <span className="text-xs text-gray-400">
                          {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{project.name}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>
                      <button
                        onClick={() => navigate(`/project/${project._id}`)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                      >
                        View Project →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Create Project Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-md transform transition-all">
              <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Create New Project</h2>
              <form onSubmit={createProject}>
                <div className="mb-4">
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g., E-commerce App"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    required
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Description</label>
                  <textarea
                    placeholder="What's this project about?"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows="3"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;