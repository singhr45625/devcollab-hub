import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserGroupIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function InvitePage({ token, setToken }) {
  const { token: inviteToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);
  
  useEffect(() => {
    verifyInvite();
  }, []);
  
  const verifyInvite = async () => {
    try {
      // First, check if invite is valid
      const res = await axios.get(`/api/invitations/verify/${inviteToken}`);
      setProjectInfo(res.data);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired invitation');
      setLoading(false);
    }
  };
  
  const acceptInvite = async () => {
    if (!token) {
      // Redirect to login with return URL
      localStorage.setItem('returnUrl', `/invite/${inviteToken}`);
      navigate('/login');
      return;
    }
    
    try {
      const res = await axios.post(`/api/invitations/accept/${inviteToken}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Successfully joined the project!');
      navigate(`/project/${res.data.project._id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join project');
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <UserGroupIcon className="h-10 w-10 text-blue-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Project Invitation</h1>
        <p className="text-gray-600 mb-6">
          You've been invited to join a project
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-800">{projectInfo?.projectName}</h3>
          <p className="text-sm text-gray-600 mt-1">{projectInfo?.description}</p>
          <p className="text-xs text-gray-500 mt-2">
            Invited by: {projectInfo?.invitedBy}
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={acceptInvite}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircleIcon className="h-5 w-5" />
            Accept Invitation
          </button>
          
          {!token && (
            <p className="text-sm text-gray-500">
              You'll need to login or create an account to join
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default InvitePage;