import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      initialized: false,

      login: (userData, token) => {
        console.log('🔐 Login:', userData.email);
        // Normalize user shape — support both JWT API response and Firebase response formats
        const id = userData.id || userData._id || userData.uid;
        const normalized = {
          ...userData,
          uid: id,
          id,
          _id: id,
          name: userData.name || userData.displayName || userData.email?.split('@')[0] || 'User',
          displayName: userData.name || userData.displayName || userData.email?.split('@')[0] || 'User',
        };
        set({
          user: normalized,
          token: token,
          isAuthenticated: true,
          initialized: true,
        });
      },

      logout: () => {
        console.log('🔓 Logout');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          initialized: true,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }));
      },

      updateToken: (token) => {
        set({ token });
      },

      setInitialized: () => {
        set({ initialized: true });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
