import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      subscription: null,
      isLoading: false,

      setAuth: (token, user, subscription = null) => {
        set({ token, user, subscription });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },

      logout: () => {
        set({ user: null, token: null, subscription: null });
        delete api.defaults.headers.common['Authorization'];
      },

      refreshMe: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user, subscription: data.subscription });
          return data;
        } catch {
          get().logout();
        }
      },

      isAuthenticated: () => !!get().token,
      isAdmin: () => get().user?.role === 'admin',
      hasSubscription: () => get().subscription?.status === 'active',
    }),
    {
      name: 'golf-charity-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);

export default useAuthStore;
