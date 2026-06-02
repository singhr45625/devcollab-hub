import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { BellIcon } from '@heroicons/react/24/outline';
import NotificationCenter from './NotificationCenter';
import io from 'socket.io-client';

// Notification sound (using Web Audio API)
const playNotificationSound = () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 880;
  gainNode.gain.value = 0.3;
  
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.5);
  oscillator.stop(audioContext.currentTime + 0.5);
};

// Request desktop notification permission
const requestDesktopNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};

const showDesktopNotification = (title, body, icon = '/logo192.png') => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, { body, icon });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

function NotificationBell({ token }) {
  const [showCenter, setShowCenter] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('notificationSound') !== 'false');
  const [desktopEnabled, setDesktopEnabled] = useState(localStorage.getItem('desktopNotifications') === 'true');
  const socketRef = useRef();
  
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error(err);
    }
  }, [token]);
  
  useEffect(() => {
    fetchUnreadCount();
    
    // Request permissions
    if (desktopEnabled) {
      requestDesktopNotificationPermission();
    }
    
    // Connect to socket for real-time notifications
    const socketUrl = import.meta.env.VITE_API_URL || undefined;
    socketRef.current = io(socketUrl, { path: '/socket.io' });
    
    // Get user ID from token
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      socketRef.current.emit('join-user', payload.userId);
      
      socketRef.current.on('new-notification', (data) => {
        setUnreadCount(data.unreadCount);
        
        // Play sound
        if (soundEnabled) {
          playNotificationSound();
        }
        
        // Show desktop notification
        if (desktopEnabled && data.notification) {
          showDesktopNotification(
            data.notification.title,
            data.notification.message
          );
        }
      });
      
      socketRef.current.on('notification-read', (data) => {
        setUnreadCount(data.unreadCount);
      });
      
      socketRef.current.on('notifications-read-all', () => {
        fetchUnreadCount();
      });
      
      socketRef.current.on('notification-deleted', (data) => {
        setUnreadCount(data.unreadCount);
      });
    } catch (err) {
      console.error(err);
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, soundEnabled, desktopEnabled, fetchUnreadCount]);
  
  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('notificationSound', newState);
  };
  
  const toggleDesktop = () => {
    const newState = !desktopEnabled;
    setDesktopEnabled(newState);
    localStorage.setItem('desktopNotifications', newState);
    
    if (newState) {
      requestDesktopNotificationPermission();
    }
  };
  
  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowCenter(true)}
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <BellIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        
        {/* Settings Dropdown */}
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg hidden group-hover:block">
          <div className="p-2">
            <label className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Sound</span>
              <button
                onClick={toggleSound}
                className={`w-10 h-5 rounded-full transition-colors ${
                  soundEnabled ? 'bg-blue-600' : 'bg-gray-300'
                } relative`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </label>
            <label className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
              <span className="text-sm text-gray-700 dark:text-gray-300">Desktop</span>
              <button
                onClick={toggleDesktop}
                className={`w-10 h-5 rounded-full transition-colors ${
                  desktopEnabled ? 'bg-blue-600' : 'bg-gray-300'
                } relative`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  desktopEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </label>
          </div>
        </div>
      </div>
      
      {showCenter && (
        <NotificationCenter token={token} socket={socketRef.current} onClose={() => setShowCenter(false)} />
      )}
    </>
  );
}

export default NotificationBell;