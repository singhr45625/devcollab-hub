import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { ClockIcon, CheckCircleIcon, PlusCircleIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

function ActivityFeed({ projectId, token }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchActivities();
    
    // Listen for real-time activities
    const socketUrl = import.meta.env.VITE_API_URL || undefined;
    const socket = io(socketUrl, { path: '/socket.io' });
    socket.emit('join-project', projectId);
    socket.on('new-activity', (activity) => {
      setActivities(prev => [activity, ...prev].slice(0, 50));
    });
    
    return () => socket.disconnect();
  }, [projectId]);
  
  const fetchActivities = async () => {
    try {
      const res = await axios.get(`/api/activities/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const getActivityIcon = (action) => {
    switch(action) {
      case 'completed_task': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'created_task': return <PlusCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'commented': return <ChatBubbleLeftIcon className="h-5 w-5 text-purple-500" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getActivityText = (activity) => {
    switch(activity.action) {
      case 'created_task':
        return `created task "${activity.details.taskTitle}"`;
      case 'completed_task':
        return `completed task "${activity.details.taskTitle}"`;
      case 'commented':
        return `commented on "${activity.details.taskTitle}"`;
      case 'changed_status':
        return `moved "${activity.details.taskTitle}" from ${activity.details.oldStatus} to ${activity.details.newStatus}`;
      default:
        return activity.action;
    }
  };
  
  if (loading) {
    return <div className="text-center py-4">Loading activity...</div>;
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <ClockIcon className="h-5 w-5" />
        Recent Activity
      </h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities.map((activity) => (
          <div key={activity._id} className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {getActivityIcon(activity.action)}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-800 dark:text-white">
                <span className="font-semibold">{activity.user?.name}</span>{' '}
                {getActivityText(activity)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
        
        {activities.length === 0 && (
          <p className="text-center text-gray-500 py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
}

export default ActivityFeed;