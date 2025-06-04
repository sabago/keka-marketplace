"use client";

import { useEffect, useState } from 'react';
import { useAuth } from './authContext';

/**
 * Custom hook to check if the user has admin access
 * This will return true if:
 * 1. The user is logged in and has the administrator role, OR
 * 2. The app is running on localhost (development mode)
 */
export function useAdminAccess() {
  const { isLoggedIn, user } = useAuth();
  const [isLocalhost, setIsLocalhost] = useState(false);
  
  useEffect(() => {
    // Check if we're running on localhost
    if (typeof window !== 'undefined') {
      setIsLocalhost(window.location.hostname === 'localhost');
    }
  }, []);

  // User has admin access if they're logged in with admin role OR we're on localhost
  const hasAdminAccess = 
    (isLoggedIn && user?.roles && user.roles.includes('administrator')) || 
    isLocalhost;

  return {
    hasAdminAccess,
    isLocalhost,
    isLoggedIn,
    user
  };
}
