import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';

axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';
import Login from '../components/Login';
import Register from '../components/Register';
import Dashboard from '../components/Dashboard';
import ProjectBoard from '../components/ProjectBoard';
import InvitePage from '../components/InvitePage';
import { Toaster } from 'react-hot-toast';
import ThemeContext from './ThemeContext';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common.Authorization;
    }
  }, [token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && error.response?.data?.error === 'Invalid token') {
          setToken(null);
          localStorage.removeItem('token');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [setToken]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-slate-950">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: darkMode ? '#374151' : '#fff',
                color: darkMode ? '#fff' : '#000',
              },
            }}
          />
          <Routes>
            <Route path="/login" element={ !token ? <Login setToken={setToken} /> : <Navigate to="/"/>} />
            <Route path="/register" element={ !token ? <Register setToken={setToken} /> : <Navigate to="/"/>} />
            <Route path="/invite/:token" element={
              token ? <InvitePage token={token} /> : <InvitePage setToken={setToken} />
            } />
            <Route path="/" element={ token ? <Dashboard token={token} setToken={setToken} /> : <Navigate to="/login"/>} />
            <Route path="/project/:id" element={ token ? <ProjectBoard token={token} /> : <Navigate to="/login"/>} />
          </Routes>
        </div>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;