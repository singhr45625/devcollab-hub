import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { UserPlusIcon } from '@heroicons/react/24/solid';

function Register({ setToken }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/register', { name, email, password });
      setToken(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setLoading(false);
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="px-8 py-8 mt-4 text-left bg-white shadow-xl rounded-2xl w-96">
        <div className="flex justify-center mb-6">
          <div className="bg-green-600 rounded-full p-3">
            <UserPlusIcon className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-center text-gray-800">Create Account</h3>
        <p className="text-gray-500 text-center mb-6">Join DevCollab today</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <div>
              <label className="block text-gray-700 text-sm font-semibold mb-2">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-gray-700 text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mt-4">
              <label className="block text-gray-700 text-sm font-semibold mb-2">Password</label>
              <input
                type="password"
                placeholder="Create a strong password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
            </div>
            <div className="flex items-baseline justify-between mt-6">
              <button 
                type="submit"
                disabled={loading}
                className="w-full px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </div>
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;