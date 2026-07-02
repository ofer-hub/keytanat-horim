import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { AppUser, Parent, Child, UserRole } from '../types';
import { firebaseAuth, isFirebaseConfigured } from '../firebase/config';
import {
  getUserByUid,
  getPhoneIndex,
  createUserProfile,
  migratePhoneToUid,
  getChildrenByParent,
  createAdminUser,
} from '../firebase/db';
import { ADMIN_PHONE, ADMIN_CODE } from '../firebase/config';
import { normalizePhone } from '../utils/phone';

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
  checkPhone: (phone: string) => Promise<{ exists: boolean; role?: UserRole }>;
  login: (phone: string, code: string) => Promise<{ ok: boolean; error?: string }>;
  registerParent: (data: {
    firstName: string;
    lastName: string;
    phone: string;
    accessCode: string;
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
  isAdmin: boolean;
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

  const checkPhone = useCallback(async (phone: string) => {
    const normalized = normalizePhone(phone);
    if (ADMIN_PHONE && normalized === normalizePhone(ADMIN_PHONE)) return { exists: true, role: 'admin' as UserRole };
    const entry = await getPhoneIndex(normalized);
    if (!entry) return { exists: false };
    return { exists: true, role: entry.role };
  }, []);

  const login = useCallback(async (phone: string, code: string) => {
    const normalized = normalizePhone(phone);

    // Admin login via env credentials
    if (ADMIN_PHONE && normalized === normalizePhone(ADMIN_PHONE)) {
      if (!ADMIN_CODE || code.trim() !== ADMIN_CODE) return { ok: false, error: 'קוד אדמין שגוי' };
      const uid = firebaseUid ?? ('admin_' + Date.now().toString(36));
      // Ensure Firestore admin doc exists so Firestore rules pass
      try {
        const existing = await Promise.race([
          getUserByUid(uid),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        if (!existing || existing.role !== 'admin') {
          await Promise.race([
            createAdminUser(uid, normalized),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000)),
          ]);
        }
      } catch { /* network unavailable — session still works locally */ }
      const adminUser: AppUser = {
        id: uid, uid, role: 'admin',
        firstName: 'מנהל', lastName: 'מערכת',
        phone: normalized, familyId: 'admin',
        createdAt: new Date().toISOString(),
      };
      persist(adminUser);
      return { ok: true };
    }

    const phoneEntry = await getPhoneIndex(normalized);
    if (!phoneEntry) return { ok: false, error: 'לא נמצא חשבון עם מספר זה' };
    if (phoneEntry.accessCode !== code.trim()) return { ok: false, error: 'קוד שגוי' };

    const currentUid = firebaseUid;
    if (!currentUid) return { ok: false, error: 'שגיאת חיבור — נסה שוב' };

    let user: AppUser | null = null;
    if (phoneEntry.uid === currentUid) {
      user = await getUserByUid(currentUid);
    } else {
      const oldUser = await getUserByUid(phoneEntry.uid);
      if (!oldUser) return { ok: false, error: 'שגיאה בטעינת פרופיל' };
      await migratePhoneToUid(normalized, currentUid, oldUser as Parent | Child);
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
  }) => {
    const normalized = normalizePhone(data.phone);
    const existing = await getPhoneIndex(normalized);
    if (existing) return { ok: false, error: 'כבר קיים חשבון עם מספר זה' };

    if (!firebaseUid) return { ok: false, error: 'שגיאת חיבור — נסה שוב' };

    const user = await createUserProfile(firebaseUid, {
      role: 'parent',
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: normalized,
      accessCode: data.accessCode.trim(),
      familyId: normalized,
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

    const normalized = normalizePhone(data.phone);
    const existing = await getPhoneIndex(normalized);
    if (existing) return { ok: false, error: 'כבר קיים חשבון עם מספר זה' };

    // Children get their own unique ID (not the parent's UID)
    const childUid = 'child_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    try {
      await createUserProfile(childUid, {
        role: 'child',
        firstName: data.firstName.trim(),
        lastName: (currentUser as Parent).lastName,
        phone: normalized,
        accessCode: data.accessCode.trim(),
        familyId: currentUser.familyId,
        createdByParentId: currentUser.id,
      } as Omit<Child, 'id' | 'uid' | 'createdAt'>);
    } catch {
      return { ok: false, error: 'שגיאת חיבור — לא ניתן לשמור. בדוק אינטרנט ונסה שוב' };
    }

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
  const isAdmin = currentUser?.role === 'admin';

  // Expose getChildrenByParent for FamilyScreen
  void getChildrenByParent;

  return (
    <AuthContext.Provider value={{
      currentUser, firebaseUid, loading,
      checkPhone, login,
      registerParent, addChild, logout,
      isParent, isChild, isAdmin,
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
