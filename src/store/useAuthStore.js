import { create } from 'zustand';
import { api } from '../services/api';

export const useAuthStore = create((set) => ({
  isAuthenticated: false,
  currentUser: null,
  isLoginModalOpen: true,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.login({ username, password });
      if (response.success) {
        set({
          isAuthenticated: true,
          currentUser: response.user,
          isLoginModalOpen: false,
          isEditProfileOpen: !!response.user.forcePasswordChange,
          isLoading: false,
          error: null,
        });
        return { success: true };
      } else {
        set({ isLoading: false, error: response.error || 'Authentication failed' });
        return { success: false, error: response.error || 'Authentication failed' };
      }
    } catch (err) {
      set({ isLoading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },

  logout: () => {
    set({
      isAuthenticated: false,
      currentUser: null,
      isLoginModalOpen: true,
      isEditProfileOpen: false,
      error: null,
    });
  },

  setLoginModalOpen: (isOpen) => set({ isLoginModalOpen: isOpen }),

  isEditProfileOpen: false,
  setEditProfileOpen: (isOpen) => set({ isEditProfileOpen: isOpen }),

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.auth.updateProfile(profileData);
      if (response.success && response.user) {
        set({
          currentUser: response.user,
          isLoading: false,
          error: null,
        });
        return { success: true, message: response.message || 'Profile updated successfully' };
      } else {
        set({ isLoading: false, error: response.error || 'Failed to update profile' });
        return { success: false, error: response.error || 'Failed to update profile' };
      }
    } catch (err) {
      set({ isLoading: false, error: err.message });
      return { success: false, error: err.message };
    }
  },
}));
