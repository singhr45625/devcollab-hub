import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserCircleIcon, EnvelopeIcon, XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function ProjectMembers({ projectId, token, userRole }) {
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  
  useEffect(() => {
    fetchMembers();
  }, [projectId]);
  
  const fetchMembers = async () => {
    try {
      const res = await axios.get(`/api/invitations/project/${projectId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOwner(res.data.owner);
      setMembers(res.data.members);
    } catch (err) {
      console.error(err);
    }
  };
  
  const sendInvite = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/invitations/project/${projectId}/invite`, {
        email: inviteEmail,
        role: inviteRole
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invitation');
    }
  };
  
  const removeMember = async (userId) => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await axios.delete(`/api/invitations/project/${projectId}/members/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Member removed');
        fetchMembers();
      } catch (err) {
        toast.error('Failed to remove member');
      }
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Team Members ({members.length + 1})
        </h3>
        {(userRole === 'owner' || userRole === 'admin') && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Invite Member
          </button>
        )}
      </div>
      
      {/* Owner */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCircleIcon className="h-10 w-10 text-blue-600" />
            <div>
              <p className="font-semibold text-gray-800 dark:text-white">{owner?.name}</p>
              <p className="text-sm text-gray-500">{owner?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">Owner</span>
          </div>
        </div>
      </div>
      
      {/* Members */}
      <div className="space-y-3">
        {members.map((member) => (
          <div key={member._id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
              <div>
                <p className="font-medium text-gray-800 dark:text-white">{member.name}</p>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full ${
                member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {member.role}
              </span>
              {(userRole === 'owner' || (userRole === 'admin' && member.role !== 'admin')) && (
                <button
                  onClick={() => removeMember(member._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Invite Team Member</h3>
            <form onSubmit={sendInvite}>
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member (Can edit tasks)</option>
                  <option value="admin">Admin (Can manage members)</option>
                  <option value="viewer">Viewer (Read only)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectMembers;