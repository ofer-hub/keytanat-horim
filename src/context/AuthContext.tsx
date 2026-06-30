import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { AppUser, Parent } from '../types';
import { firebaseAuth, isFirebaseConfigured } from '../firebase/config';
import {
  getUserByUid,
  getPhoneIndex,
  createUserProfile,
  migratePhoneToUid,
  getChildrenByParent,
} from '../firebase/db';

const PARENT_CODE = import.meta.env.VITE_PARENT_CODE || 'horim2026';
const SESSION_KEY = 'keytanat_session_v2';
const LOCAL_UID_KEY = 'keytanat_local_uid';

function getOrCreateLocalUid(): string {
  let uid = localStorage.getItem(LOCAL_UID_KEY);
  if (!uid) {
    uid = 'local_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(LOCAL_UID_KEY, uid);
  }
  return uid;
}

interface AuthContextValue {
  currentUser: AppUser | null;
  firebaseUid: string | null;
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
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Step 1: Sign in anonymously and track UID
  useEffect(() => {
    if (isFirebaseConfigured && firebaseAuth) {
      const unsub = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          setFirebaseUid(user.uid);
        } else {
          // Auto sign in anonymously
          signInAnonymously(firebaseAuth).catch(console.error);
        }
      });
      return unsub;
    } else {
      // Demo mode: use stable local UID
      setFirebaseUid(getOrCreateLocalUid());
    }
  }, []);

  // Step 2: Restore session from localStorage
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

  const persist = useCallback((user: AppUser | null) => {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
    setCurrentUser(user);
  }, []);

  const loginAsParent = useCallback(async (phone: string, code: string) => {
    const phoneEntry = await getPhoneIndex(phone.trim());
    if (!phoneEntry) return { ok: false, error: 'לא נמצא הורה עם מספר זה' };
    if (phoneEntry.role !== 'parent') return { ok: false, error: 'מספר זה רשום כילד, לא כהורה' };
    if (phoneEntry.accessCode !== code.trim()) return { ok: false, error: 'קוד שגוי' };

    const currentUid = firebaseUid;
    if (!currentUid) return { ok: false, error: 'שגיאת חיבור — נסה שוב' };

    let user: AppUser | null = null;

    if (phoneEntry.uid === currentUid) {
      // Same device — just load profile
      user = await getUserByUid(currentUid);
    } else {
      // Different device — migrate to current uid
      const oldUser = await getUserByUid(phoneEntry.uid);
      if (!oldUser) return { ok: false, error: 'שגיאה בטעינת פרופיל' };
      await migratePhoneToUid(phone.trim(), currentUid, oldUser);
      user = { ...oldUser, id: currentUid, uid: currentUid };
    }

    if (!user) return { ok: false, error: 'שגיאה בטעינת פרופיל' };
    persist(user);
    return { ok: true };
  }, [firebaseUid, persist]);

  const loginAsChild = useCallback(async (phone: string, code: string) => {
    const phoneEntry = await getPhoneIndex(phone.trim());
    if (!phoneEntry) return { ok: false, error: 'לא נמצא ילד עם מספר זה' };
    if (phoneEntry.role !== 'child') return { ok: false, error: 'מספר זה רשום כהורה, לא כילד' };
    if (phoneEntry.accessCode !== code.trim()) return { ok: false, error: 'קוד שגוי' };

    const currentUid = firebaseUid;
    if (!currentUid) return { ok: false, error: 'שגיאת חיבור — נסה שוב' };

    let user: AppUser | null = null;
    if (phoneEntry.uid === currentUid) {
      user = await getUserByUid(currentUid);
    } else {
      const oldUser = await getUserByUid(phoneEntry.uid);
      if (!oldUser) return { ok: false, error: 'שגיאה בטעינת פרופיל' };
      await migratePhoneToUid(phone.trim(), currentUid, oldUser);
      user = { ...oldUser, id: currentUid, uid: currentUid };
    }

    if (!user) return { ok: false, error: 'שגיאה בטעינת פרופיל' };
    persist(user);
    return { ok: true };
  }, [firebaseUid, persist]);

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

    const existing = await getPhoneIndex(data.phone.trim());
    if (existing) return { ok: false, error: 'כבר קיים חשבון עם מספר זה' };

    if (!firebaseUid) return { ok: false, error: 'שגיאת חיבור — נסה שוב' };

    const user = await createUserProfile(firebaseUid, {
      role: 'parent',
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      accessCode: data.accessCode.trim(),
      familyId: data.phone.trim(),
    });
    persist(user);
    return { ok: true };
  }, [firebaseUid, persist]);

  const addChild = useCallback(async (data: {
    firstName: string;
    lastName: string;
    phone: string;
    accessCode: string;
  }) => {
    if (!currentUser || currentUser.role !== 'parent') {
      return { ok: false, error: 'רק הורה יכול להוסיף ילד' };
    }

    const existing = await getPhoneIndex(data.phone.trim());
    if (existing) return { ok: false, error: 'כבר קיים חשבון עם מספר זה' };

    // Children get their own unique ID (not the parent's UID)
    const childUid = 'child_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await createUserProfile(childUid, {
      role: 'child',
      firstName: data.firstName.trim(),
      lastName: (currentUser as Parent).lastName,
      phone: data.phone.trim(),
      accessCode: data.accessCode.trim(),
      familyId: currentUser.familyId,
      createdByParentId: currentUser.id,
    } as Omit<AppUser, 'id' | 'uid' | 'createdAt'>);

    return { ok: true };
  }, [currentUser]);

  const logout = useCallback(() => persist(null), [persist]);

  // Keep session in sync if currentUser data changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const isParent = currentUser?.role === 'parent';
  const isChild = currentUser?.role === 'child';

  // Expose getChildrenByParent for FamilyScreen
  void getChildrenByParent;

  return (
    <AuthContext.Provider value={{
      currentUser, firebaseUid, loading,
      loginAsParent, loginAsChild,
      registerParent, addChild, logout,
      isParent, isChild,
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
