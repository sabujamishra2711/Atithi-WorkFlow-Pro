/**
 * Custom hook for user profile management in Atithi WorkFlow Pro
 */

import { useState, useEffect } from 'react';
import { getUserProfile } from '@/utils/authUtils';

export const useUserProfile = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getUserProfile();
      
      if (result.success) {
        setUser(result.data);
      } else {
        setError(result.error || 'Failed to load user profile');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  return {
    user,
    isLoading,
    error,
    refreshProfile: fetchUserProfile
  };
};