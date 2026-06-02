import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  BellIcon, 
  CheckIcon, 
  XMarkIcon,
  TrashIcon,
  EnvelopeIcon,
  UserGroupIcon,
  ChatBubbleLeftIcon,
  CheckBadgeIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const NotificationIcon = ({ type }) => {
  switch(type) {
    case 'task_assigned':
      return <UserGroupIcon className="h-5 w-5 text-blue-500" />;
    case 'task_completed':
      return <CheckBadgeIcon className="h-5 w-5 text-green-500" />;
    case 'comment_added':
      return <ChatBubbleLeftIcon className="h-5 w-5 text-purple-500" />;
    case 'deadline_approaching':
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    case 'task_overdue':
      return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
    case 'mention':
      return <EnvelopeIcon className="h-5 w-5 text-indigo-500" />;
    default:
      return <BellIcon className="h-5 w-5 text-gray-500" />;
  }
};

function NotificationCenter({ token, socket, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState(null);
  
  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const res = await axios.get(`/api/notifications?page=${currentPage}&limit=20&filter=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (reset) {
        setNotifications(res.data.notifications);
        setPage(1);
      } else {
        setNotifications(prev => [...prev, ...res.data.notifications]);
      }
      
      setHasMore(res.data.notifications.length === 20);
      setStats(prev => ({ ...prev, unreadCount: res.data.unreadCount }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, token]);
  
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);
  
  useEffect(() => {
    fetchNotifications(true);
    fetchStats();
  }, [filter]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewNotification = (data) => {
      if (data.notification) {
        setNotifications(prev => {
          if (prev.some(n => n._id === data.notification._id)) return prev;
          return [data.notification, ...prev];
        });
        fetchStats();
      }
    };
    
    socket.on('new-notification', handleNewNotification);
    
    return () => {
      socket.off('new-notification', handleNewNotification);
    };
  }, [socket, fetchStats]);
  
  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      await axios.patch('/api/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      fetchStats();
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };
  
  const deleteNotification = async (id) => {
    try {
      await axios.delete(`/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n._id !== id));
      fetchStats();
      toast.success('Notification deleted');
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  };
  
  const deleteAllRead = async () => {
    if (window.confirm('Delete all read notifications?')) {
      try {
        await axios.delete('/api/notifications/read/all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.filter(n => !n.read));
        toast.success('Read notifications deleted');
      } catch (err) {
        toast.error('Failed to delete notifications');
      }
    }
  };
  
  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };
  
  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    if (notification.metadata?.actionUrl) {
      window.location.href = notification.metadata.actionUrl;
    }
  };
  
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'border-l-4 border-red-500';
      case 'high': return 'border-l-4 border-orange-500';
      case 'medium': return 'border-l-4 border-yellow-500';
      default: return '';
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BellIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Notifications</h2>
              {stats && stats.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {stats.unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Mark all as read"
              >
                <CheckIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={deleteAllRead}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Delete all read"
              >
                <TrashIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex gap-2 overflow-x-auto">
              {['all', 'unread', 'task_assigned', 'comment_added', 'deadline_approaching'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : 
                   f === 'unread' ? 'Unread' :
                   f === 'task_assigned' ? 'Assigned' :
                   f === 'comment_added' ? 'Comments' : 'Deadlines'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Stats Summary */}
          {stats && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.unreadCount}</p>
                <p className="text-xs text-gray-500">Unread</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">{stats.totalCount}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.byPriority?.urgent || 0}</p>
                <p className="text-xs text-gray-500">Urgent</p>
              </div>
            </div>
          )}
          
          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No notifications</p>
              </div>
            ) : (
              <>
                {notifications.map(notification => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b dark:border-gray-700 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${getPriorityColor(notification.priority)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                          {!notification.read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {hasMore && (
                  <div className="p-4 text-center">
                    <button
                      onClick={loadMore}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Load more
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationCenter;