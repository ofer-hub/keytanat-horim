import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppUser, Parent } from '../types';
import {
  getParentByPhone,
  getChildByPhone,
  createParent,
  createChild,
} from '../firebase/db';

const PARENT_CODE = import.meta.env.VITE_PARENT_CODE || 'horim2026';
const SESSION_KEY = 'keytanat_session';

interface AuthContextValue {
  currentUser: AppUser | null;
  loading: boolean;
  loginAsParent: (phone: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  loginAsChild: (phone: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  registerParent: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    accessCode: string;
    parentCode: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  addChild: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    accessCode: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  isParent: boolean;
  isChild: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persist = (user: AppUser | null) => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
    setCurrentUser(user);
  };

  const loginAsParent = useCallback(async (phone: string, code: string) => {
    const parent = await getParentByPhone(phone.trim());
    if (!parent) return { ok: false, error: 'לא נמצא הורה עם מספר זה' };
    if (parent.accessCode !== code.trim()) return { ok: false, error: 'קוד שגוי' };
    persist(parent);
    return { ok: true };
  }, []);

  const loginAsChild = useCallback(async (phone: string, code: string) => {
    const child = await getChildByPhone(phone.trim());
    if (!child) return { ok: false, error: 'לא נמצא ילד עם מספר זה' };
    if (child.accessCode !== code.trim()) return { ok: false, error: 'קוד שגוי' };
    persist(child);
    return { ok: true };
  }, []);

  const registerParent = useCallback(async (data: {
    firstName: string;
    lastName: string;
    phone: string;
    accessCode: string;
    parentCode: string;
  }) => {
    if (data.parentCode !== PARENT_CODE) {
      return { ok: false, error: 'קוד הורים שגוי. פנה למארגנים לקבל את הקוד.' };
    }
    const existing = await getParentByPhone(data.phone.trim());
    if (existing) return { ok: false, error: 'כבר קיים חשבון הורה עם מספר זה' };

    const parent = await createParent({
      role: 'parent',
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      accessCode: data.accessCode.trim(),
      familyId: data.phone.trim(),
    });
    persist(parent);
    return { ok: true };
  }, []);

  const addChild = useCallback(async (data: {
    firstName: string;
    lastName: string;
    phone: string;
    accessCode: string;
  }) => {
    if (!currentUser || currentUser.role !== 'parent') {
      return { ok: false, error: 'רק הורה יכול להוסיף ילד' };
    }
    const existing = await getChildByPhone(data.phone.trim());
    if (existing) return { ok: false, error: 'כבר קיים ילד עם מספר זה' };

    await createChild({
      role: 'child',
      firstName: data.firstName.trim(),
      lastName: (currentUser as Parent).lastName,
      phone: data.phone.trim(),
      accessCode: data.accessCode.trim(),
      familyId: currentUser.familyId,
      createdByParentId: currentUser.id,
    });
    return { ok: true };
  }, [currentUser]);

  const logout = useCallback(() => persist(null), []);

  const isParent = currentUser?.role === 'parent';
  const isChild = currentUser?.role === 'child';

  return (
    <AuthContext.Provider value={{
      currentUser, loading, loginAsParent, loginAsChild,
      registerParent, addChild, logout, isParent, isChild,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
