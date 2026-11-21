import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthSession } from '@/core/rules/auth-form';

/**
 * 本机会话状态（PRD V2-01 §5）。
 *
 * 只存 UI 需要的身份标记，不放凭据、密码或业务数据；云端会话由 CloudBase 保管。
 * 清除会话不影响业务表的 `ownerId`，退出登录后本机数据仍按原归属可读写。
 */

interface AuthStoreState {
  principalId: string | null;
  email: string | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const AUTH_STORAGE_KEY = 'auth.session';

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      principalId: null,
      email: null,
      setSession: (session) => set({ principalId: session.principalId, email: session.email }),
      clearSession: () => set({ principalId: null, email: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ principalId: state.principalId, email: state.email }),
    },
  ),
);
