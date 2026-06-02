import React, { useContext } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import ThemeContext from '../src/ThemeContext';

function DarkModeToggle() {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  return (
    <button
      onClick={() => setDarkMode(prev => !prev)}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle dark mode"
    >
      {darkMode ? (
        <SunIcon className="h-5 w-5 text-yellow-500" />
      ) : (
        <MoonIcon className="h-5 w-5 text-gray-600" />
      )}
    </button>
  );
}

export default DarkModeToggle;