import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { PaperAirplaneIcon, PhotoIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

function TeamChat({ 
  projectId, 
  token, 
  currentUser,
  activeCall = null,
  userRole = 'none',
  onJoinCall = null,
  onStartCall = null,
  isInCall = false
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showOnlineList, setShowOnlineList] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef();
  const typingTimeoutRef = useRef();

  useEffect(() => {
    const updatePresence = async (status) => {
      try {
        await axios.post('/api/presence/update', {
          status,
          currentProject: projectId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchMessages();
    fetchOnlineUsers();
    updatePresence('online');
    
    // Connect to WebSocket
    const socketUrl = import.meta.env.VITE_API_URL || undefined;
    socketRef.current = io(socketUrl, { path: '/socket.io' });
    socketRef.current.emit('joinProject', projectId);
    
    // Listen for new messages
    socketRef.current.on('new-message', (message) => {
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
    });
    
    // Listen for typing indicators
    socketRef.current.on('user-typing', ({ userId, isTyping }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    });
    
    // Listen for presence updates
    socketRef.current.on('presence-update', ({ user, status }) => {
      if (status === 'offline') {
        setOnlineUsers(prev => prev.filter(u => u.user._id !== user));
      } else {
        setOnlineUsers(prev => {
          const exists = prev.find(u => u.user._id === user);
          if (exists) {
            return prev.map(u => u.user._id === user ? { ...u, status } : u);
          }
          fetchOnlineUsers();
          return prev;
        });
      }
    });
    
    return () => {
      updatePresence('offline');
      socketRef.current.disconnect();
    };
  }, [projectId]);
  
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`/api/chat/project/${projectId}?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error(err);
    }
  };
  
  const fetchOnlineUsers = async () => {
    try {
      const res = await axios.get(`/api/presence/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOnlineUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    try {
      // Detect mentions (@username)
      const mentionRegex = /@(\w+)/g;
      const mentions = [];
      let match;
      while ((match = mentionRegex.exec(newMessage)) !== null) {
        mentions.push(match[1]);
      }
      
      const res = await axios.post('/api/chat', {
        projectId,
        content: newMessage,
        mentions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(prev => {
        if (prev.some(m => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setNewMessage('');
      setTimeout(scrollToBottom, 50);
      
      // Stop typing indicator
      if (socketRef.current) {
        socketRef.current.emit('stop-typing', { projectId });
      }
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { projectId });
      
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('stop-typing', { projectId });
      }, 1000);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="flex h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg relative overflow-hidden">
      {/* Online Users Sidebar (Desktop only) */}
      <div className="hidden md:block w-64 border-r dark:border-gray-700 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Online ({onlineUsers.length})
        </h3>
        <div className="space-y-3">
          {onlineUsers.map(({ user, status }) => (
            <div key={user._id} className="flex items-center gap-3">
              <div className="relative">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <span className={`absolute bottom-0 right-0 h-3 w-3 ${getStatusColor(status)} rounded-full border-2 border-white`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500">{status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Online Users Drawer Overlay */}
      {showOnlineList && (
        <div 
          className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-sm transition-opacity" 
          onClick={() => setShowOnlineList(false)}
        >
          <div 
            className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 p-4 shadow-xl flex flex-col animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-gray-700">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                Online ({onlineUsers.length})
              </h3>
              <button 
                onClick={() => setShowOnlineList(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-sm font-semibold px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1">
              {onlineUsers.map(({ user, status }) => (
                <div key={user._id} className="flex items-center gap-3">
                  <div className="relative">
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    <span className={`absolute bottom-0 right-0 h-3 w-3 ${getStatusColor(status)} rounded-full border-2 border-white`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500">{status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Area Header (Mobile Only Toggle Button + Call Actions) */}
        <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 md:bg-white md:dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 dark:text-white text-sm md:text-base">Team Chat</span>
            {activeCall && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeCall ? (
              !isInCall && (
                <button
                  onClick={onJoinCall}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>📞</span> Join Call
                </button>
              )
            ) : (
              (userRole === 'owner' || userRole === 'admin') && (
                <button
                  onClick={onStartCall}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full font-semibold transition flex items-center gap-1.5 shadow-sm border border-slate-700"
                >
                  <span>🎥</span> Start Call
                </button>
              )
            )}
            <button
              onClick={() => setShowOnlineList(true)}
              className="md:hidden text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
            >
              👥 Online ({onlineUsers.length})
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 h-96">
          {messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.sender._id === currentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] sm:max-w-[70%] ${message.sender._id === currentUser ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'} rounded-lg p-3`}>
                {message.sender._id !== currentUser && (
                  <p className="text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">
                    {message.sender.name}
                  </p>
                )}
                <p className="text-sm break-words">{message.content}</p>
                <p className="text-xs mt-1 opacity-75">
                  {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
          
          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="text-sm text-gray-500 italic">
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message Input */}
        <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full shrink-0"
            >
              <PhotoIcon className="h-5 w-5 text-gray-500" />
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Type a message..."
              className="flex-1 min-w-0 px-3 py-2 text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TeamChat;