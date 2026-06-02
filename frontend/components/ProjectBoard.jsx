import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import {
  ArrowLeftIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  CalendarIcon,
  UserCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import TeamChat from './TeamChat';
import ActivityFeed from './ActivityFeed';
import ProjectMembers from './ProjectMembers';
import './react-datepicker.css';

function ProjectBoard({ token }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(null);
  const [newTask, setNewTask] = useState({ 
    title: '', 
    description: '', 
    priority: 'medium',
    deadline: null,
    estimatedHours: 0
  });
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('kanban');
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const currentUserId = (() => {
    try {
      return token ? JSON.parse(atob(token.split('.')[1])).userId : null;
    } catch {
      return null;
    }
  })();

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchUsers();

    const socketUrl = import.meta.env.VITE_API_URL || undefined;
    const newSocket = io(socketUrl, { path: '/socket.io' });
    setSocket(newSocket);

    newSocket.emit('joinProject', id);
    newSocket.on('task-updated', () => {
      fetchTasks();
    });
    newSocket.on('comment-added', (data) => {
      if (data.taskId) {
        fetchComments(data.taskId);
      }
    });
    newSocket.on('member-joined', (data) => {
      toast.success(`${data.user?.name || 'A new member'} joined the project!`);
      fetchProject();
    });
    newSocket.on('member-left', () => {
      toast.info('A member left the project');
      fetchProject();
    });

    return () => newSocket.disconnect();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProject(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
      setMentionSuggestions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`/api/tasks/project/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchComments = async (taskId) => {
    try {
      const res = await axios.get(`/api/comments/task/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(prev => ({ ...prev, [taskId]: res.data }));
    } catch (err) {
      console.error(err);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    try {
      const deadlineValue = newTask.deadline instanceof Date
        ? newTask.deadline.toISOString()
        : newTask.deadline;

      const taskPayload = {
        title: newTask.title.trim(),
        description: newTask.description,
        priority: newTask.priority,
        deadline: deadlineValue || undefined,
        estimatedHours: typeof newTask.estimatedHours === 'number' && !Number.isNaN(newTask.estimatedHours)
          ? newTask.estimatedHours
          : 0,
        project: id,
      };

      await axios.post('/api/tasks', taskPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowTaskModal(false);
      setNewTask({ title: '', description: '', priority: 'medium', deadline: null, estimatedHours: 0 });
      fetchTasks();
      toast.success('Task created successfully!');
      if (socket) {
        socket.emit('task-update', { projectId: id });
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to create task';
      toast.error(message);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const nextStatus = status === 'todo'
        ? 'in-progress'
        : status === 'in-progress'
          ? 'review'
          : 'done';

      await axios.patch(`/api/tasks/${taskId}/status`, { status: nextStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTasks();
      toast.success('Task status updated');
      if (socket) {
        socket.emit('task-update', { projectId: id });
      }
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const addComment = async (taskId) => {
    if (!newComment.trim()) return;
    try {
      await axios.post('/api/comments', {
        content: newComment,
        taskId: taskId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewComment('');
      setShowMentions(false);
      fetchComments(taskId);
      toast.success('Comment added');
      if (socket) {
        socket.emit('new-comment', { projectId: id, taskId });
      }
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setNewComment(value);
    setCursorPosition(e.target.selectionStart);

    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === value.length - 1) {
      setShowMentions(true);
      fetchUsers();
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user) => {
    const beforeMention = newComment.slice(0, newComment.lastIndexOf('@'));
    const newText = `${beforeMention}@${user.name} `;
    setNewComment(newText);
    setShowMentions(false);
    setCursorPosition(newText.length);
  };

  const normalizeStatus = (s) => (String(s || '').toLowerCase().replace(/[^a-z]/g, ''));

  const getTasksByStatus = (status) => {
    const target = normalizeStatus(status);
    return tasks.filter(task => {
      if (!task || task.status == null) return false;
      return normalizeStatus(task.status) === target;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statusConfig = {
    todo: {
      title: 'To Do',
      accentText: 'text-amber-700 dark:text-amber-100',
      panelBg: 'bg-slate-100/80 dark:bg-slate-950/80',
      borderColor: 'border-amber-200 dark:border-amber-500/20',
    },
    'in-progress': {
      title: 'In Progress',
      accentText: 'text-sky-700 dark:text-sky-100',
      panelBg: 'bg-slate-100/80 dark:bg-slate-950/80',
      borderColor: 'border-sky-200 dark:border-sky-500/20',
    },
    review: {
      title: 'Review',
      accentText: 'text-violet-700 dark:text-violet-100',
      panelBg: 'bg-slate-100/80 dark:bg-slate-950/80',
      borderColor: 'border-violet-200 dark:border-violet-500/20',
    },
    done: {
      title: 'Done',
      accentText: 'text-emerald-700 dark:text-emerald-100',
      panelBg: 'bg-slate-100/80 dark:bg-slate-950/80',
      borderColor: 'border-emerald-200 dark:border-emerald-500/20',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      {/* Header */}
      <div className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/70 dark:border-slate-800 shadow-[0_30px_60px_-40px_rgba(15,23,42,0.15)] dark:shadow-[0_30px_60px_-40px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 px-4 py-2 text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                Back
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-950 dark:text-white">{project?.name}</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{project?.description}</p>
              </div>
            </div>
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md"
            >
              <PlusIcon className="h-5 w-5" />
              Add Task
            </button>
          </div>
        </div>
      </div>
  
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6 border-b dark:border-gray-700">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap scrollbar-thin pb-1">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'kanban'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Kanban Board
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💬 Team Chat
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📊 Activity Feed
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👥 Team Members
            </button>
          </div>
        </div>

        {activeTab === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className={`${config.panelBg} rounded-3xl p-5 min-h-[600px] border ${config.borderColor} shadow-[0_20px_50px_-20px_rgba(15,23,42,0.55)]`}>
                <div className={`flex items-center justify-between mb-4 pb-3 border-b ${config.borderColor}`}>
                  <h3 className={`font-semibold text-lg ${config.accentText}`}>
                    {config.title}
                  </h3>
                  <span className="bg-white/90 dark:bg-slate-800 px-3 py-1 rounded-full text-sm text-slate-700 dark:text-slate-200 shadow-sm">
                    {getTasksByStatus(status).length}
                  </span>
                </div>
              <div className={`${status === 'done' ? 'space-y-4 max-h-[560px] overflow-y-auto pr-1' : 'space-y-4'}`}>
                {getTasksByStatus(status).map(task => (
                  <div
                    key={task._id}
                    className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/95 dark:bg-slate-900/95 p-5 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.6)] cursor-pointer"
                    onClick={() => {
                      setShowTaskDetails(task);
                      fetchComments(task._id);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-800 dark:text-white">{task.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {task.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        {task.deadline && (
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {task.attachments?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <PaperClipIcon className="h-3 w-3" />
                            {task.attachments.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="h-3 w-3" />
                        <span>{comments[task._id]?.length || 0}</span>
                      </div>
                    </div>
                    {status !== 'done' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task._id, status);
                        }}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:bg-slate-800"
                      >
                        {status === 'todo' ? 'Start →' : status === 'in-progress' ? 'Send to Review →' : 'Complete ✓'}
                      </button>
                    )}
                  </div>
                ))}
                {getTasksByStatus(status).length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-300/30 bg-white/80 dark:bg-slate-900/80 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No tasks in {config.title.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="h-[600px]">
          <TeamChat projectId={id} token={token} currentUser={currentUserId} />
        </div>
      )}

      {activeTab === 'activity' && (
        <ActivityFeed projectId={id} token={token} />
      )}

      {activeTab === 'members' && (
        <ProjectMembers projectId={id} token={token} userRole={project?.userRole} />
      )}
      </div>
  
      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-[36px] border border-slate-200/40 bg-white/95 dark:border-white/10 dark:bg-slate-950/95 p-8 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.18)] dark:shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Create New Task</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={createTask}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g., Design database schema"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Description</label>
                <textarea
                  placeholder="Add more details about this task..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Priority</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Deadline</label>
                <DatePicker
                  selected={newTask.deadline}
                  onChange={(date) => setNewTask({ ...newTask, deadline: date })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  placeholderText="Select deadline"
                  dateFormat="MMMM d, yyyy"
                  showPopperArrow={false}
                  isClearable
                  minDate={new Date()}
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Estimated Hours</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask({ ...newTask, estimatedHours: Math.max(0, parseFloat(e.target.value) || 0) })}
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  
      {/* Task Details Modal */}
      {showTaskDetails && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-[36px] border border-slate-200/40 bg-white/95 dark:border-white/10 dark:bg-slate-950/95 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.18)] dark:shadow-[0_40px_120px_-60px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-white">{showTaskDetails.title}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className={`text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 ${priorityColors[showTaskDetails.priority]}`}>
                    {showTaskDetails.priority}
                  </span>
                  {showTaskDetails.deadline && (
                    <span className="text-xs text-slate-300 flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      Due: {new Date(showTaskDetails.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setShowTaskDetails(null)} className="text-slate-400 hover:text-white transition">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{showTaskDetails.description || 'No description provided'}</p>
              </div>
          
              {/* Comments Section */}
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  Comments
                </h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {(comments[showTaskDetails._id] || []).map(comment => (
                    <div key={comment._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCircleIcon className="h-5 w-5 text-gray-500" />
                        <span className="font-semibold text-sm text-gray-800 dark:text-white">
                          {comment.author?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{comment.content}</p>
                    </div>
                  ))}
                  {(!comments[showTaskDetails._id] || comments[showTaskDetails._id].length === 0) && (
                    <p className="text-gray-500 text-sm">No comments yet</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <textarea
                    value={newComment}
                    onChange={handleCommentChange}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                  />
                  {showMentions && mentionSuggestions.length > 0 && (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 p-2 max-h-40 overflow-y-auto shadow-lg">
                      {mentionSuggestions.slice(0, 5).map((user) => (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => insertMention(user)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          @{user.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => addComment(showTaskDetails._id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 self-end"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
            
export default ProjectBoard;