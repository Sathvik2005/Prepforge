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
        set({
          user: userData,
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
