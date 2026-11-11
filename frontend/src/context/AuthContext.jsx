import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, healthAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncVersion, setSyncVersion] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState({
    loaded: false,
    cloud_sync_ready: true,
    requires_cloud_config: false,
    storage_driver: 'checking',
    cross_device_sync: 'checking',
  });

  const refreshCloudStatus = useCallback(async () => {
    try {
      const res = await healthAPI.check();
      setCloudStatus({
        loaded: true,
        cloud_sync_ready: Boolean(res.data?.cloud_sync_ready),
        requires_cloud_config: Boolean(res.data?.requires_cloud_config),
        storage_driver: res.data?.storage_driver || res.data?.storage || 'unknown',
        cross_device_sync: res.data?.cross_device_sync || 'unknown',
      });
    } catch {
      setCloudStatus((prev) => ({
        ...prev,
        loaded: true,
        cloud_sync_ready: false,
        storage_driver: 'unreachable',
      }));
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      refreshCloudStatus();
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Auth check failed:', err);
          if (err?.response?.status === 401 || err?.response?.status === 404) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [refreshCloudStatus]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const res = await authAPI.register(formData);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const updateUserProfile = async (profileData) => {
    const res = await authAPI.updateProfile(profileData);
    setUser((prev) => {
      const updatedUser = {
        ...prev,
        full_name: res.data?.full_name || profileData.full_name || prev?.full_name,
        profile: res.data,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
    return res.data;
  };

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await refreshCloudStatus();
      const token = localStorage.getItem('token');
      if (token) {
        const res = await authAPI.getMe();
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      }
      setSyncVersion((v) => v + 1);
    } catch (err) {
      console.error('Manual sync error:', err);
    } finally {
      setSyncing(false);
    }
  }, [refreshCloudStatus]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        cloudStatus,
        syncVersion,
        syncing,
        login,
        register,
        logout,
        updateUserProfile,
        refreshCloudStatus,
        triggerSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
