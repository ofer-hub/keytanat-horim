import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import type { Parent, Child, AppUser, Activity, ActivityEscort, ActivityRegistration, PhoneIndex } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowISO(): string { return new Date().toISOString(); }
function newId(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function toISO(val: unknown): string {
  if (!val) return nowISO();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return nowISO();
}

// ─── LocalStorage Store ───────────────────────────────────────────────────────

interface Store {
  users: (Parent | Child)[];
  phoneIndex: Record<string, { uid: string; accessCode: string; role: string }>;
  activities: Activity[];
  escorts: ActivityEscort[];
  registrations: ActivityRegistration[];
}

function getStore(): Store {
  try {
    const raw = localStorage.getItem('keytanat_store_v2');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { users: [], phoneIndex: {}, activities: [], escorts: [], registrations: [] };
}

function saveStore(s: Store): void {
  localStorage.setItem('keytanat_store_v2', JSON.stringify(s));
}

// ─── USER PROFILES (users/{uid}) ─────────────────────────────────────────────

export async function getUserByUid(uid: string): Promise<AppUser | null> {
  if (isFirebaseConfigured) {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { id: uid, uid, ...d, createdAt: toISO(d.createdAt) } as AppUser;
  }
  const store = getStore();
  return store.users.find((u) => u.id === uid) ?? null;
}

/** Look up user by phone number (for cross-device login) */
export async function getPhoneIndex(phone: string): Promise<PhoneIndex | null> {
  if (isFirebaseConfigured) {
    const snap = await getDoc(doc(db, 'phoneIndex', phone));
    if (!snap.exists()) return null;
    return snap.data() as PhoneIndex;
  }
  const store = getStore();
  const entry = store.phoneIndex[phone];
  if (!entry) return null;
  return entry as PhoneIndex;
}

export async function createUserProfile(
  uid: string,
  data: Omit<AppUser, 'id' | 'uid' | 'createdAt'>
): Promise<AppUser> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', uid), { ...data, uid, createdAt: serverTimestamp() });
    await setDoc(doc(db, 'phoneIndex', data.phone), {
      uid,
      accessCode: data.accessCode,
      role: data.role,
    });
    return { id: uid, uid, ...data, createdAt: now } as AppUser;
  }
  const store = getStore();
  const user = { id: uid, uid, ...data, createdAt: now } as AppUser;
  store.users = store.users.filter((u) => u.id !== uid);
  store.users.push(user);
  store.phoneIndex[data.phone] = { uid, accessCode: data.accessCode, role: data.role };
  saveStore(store);
  return user;
}

/** Update uid for existing phone (cross-device: user logs in on new device) */
export async function migratePhoneToUid(phone: string, newUid: string, existingData: AppUser): Promise<void> {
  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', newUid), { ...existingData, uid: newUid, updatedAt: serverTimestamp() });
    await setDoc(doc(db, 'phoneIndex', phone), { uid: newUid, accessCode: existingData.accessCode, role: existingData.role });
    return;
  }
  const store = getStore();
  store.users = store.users.filter((u) => u.id !== existingData.id);
  store.users.push({ ...existingData, id: newUid, uid: newUid });
  store.phoneIndex[phone] = { uid: newUid, accessCode: existingData.accessCode, role: existingData.role };
  saveStore(store);
}

export async function getAllUsers(): Promise<AppUser[]> {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as AppUser));
  }
  return getStore().users;
}

export async function getUsersByRole(role: 'parent' | 'child'): Promise<AppUser[]> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as AppUser));
  }
  return getStore().users.filter((u) => u.role === role);
}

export async function getChildrenByParent(parentId: string): Promise<Child[]> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'users'), where('role', '==', 'child'), where('createdByParentId', '==', parentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, uid: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as Child));
  }
  return getStore().users.filter((u) => u.role === 'child' && (u as Child).createdByParentId === parentId) as Child[];
}

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

function mapActivity(id: string, data: Record<string, unknown>): Activity {
  return {
    id,
    ...data,
    startDateTime: toISO(data.startDateTime),
    endDateTime: toISO(data.endDateTime),
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
  } as Activity;
}

export async function getActivities(): Promise<Activity[]> {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'activities'));
    return snap.docs.map((d) => mapActivity(d.id, d.data() as Record<string, unknown>));
  }
  return getStore().activities;
}

export async function createActivity(data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    const ref = await addDoc(collection(db, 'activities'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { id: ref.id, ...data, createdAt: now, updatedAt: now };
  }
  const store = getStore();
  const activity: Activity = { id: newId(), ...data, createdAt: now, updatedAt: now };
  store.activities.push(activity);
  saveStore(store);
  return activity;
}

export async function updateActivity(id: string, data: Partial<Activity>): Promise<void> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'activities', id), { ...data, updatedAt: serverTimestamp() });
    return;
  }
  const store = getStore();
  const idx = store.activities.findIndex((a) => a.id === id);
  if (idx >= 0) store.activities[idx] = { ...store.activities[idx], ...data, updatedAt: now };
  saveStore(store);
}

export async function deleteActivity(id: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'activities', id));
    const [eSnap, rSnap] = await Promise.all([
      getDocs(query(collection(db, 'activityEscorts'), where('activityId', '==', id))),
      getDocs(query(collection(db, 'activityRegistrations'), where('activityId', '==', id))),
    ]);
    await Promise.all([...eSnap.docs.map((d) => deleteDoc(d.ref)), ...rSnap.docs.map((d) => deleteDoc(d.ref))]);
    return;
  }
  const store = getStore();
  store.activities = store.activities.filter((a) => a.id !== id);
  store.escorts = store.escorts.filter((e) => e.activityId !== id);
  store.registrations = store.registrations.filter((r) => r.activityId !== id);
  saveStore(store);
}

// ─── REAL-TIME SUBSCRIPTIONS ──────────────────────────────────────────────────

export function subscribeToActivities(cb: (acts: Activity[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    cb(getStore().activities);
    return () => {};
  }
  return onSnapshot(collection(db, 'activities'), (snap) => {
    cb(snap.docs.map((d) => mapActivity(d.id, d.data() as Record<string, unknown>)));
  });
}

export function subscribeToAllEscorts(cb: (escorts: ActivityEscort[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    cb(getStore().escorts);
    return () => {};
  }
  return onSnapshot(collection(db, 'activityEscorts'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), joinedAt: toISO(d.data().joinedAt) } as ActivityEscort)));
  });
}

export function subscribeToAllRegistrations(cb: (regs: ActivityRegistration[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    cb(getStore().registrations);
    return () => {};
  }
  return onSnapshot(collection(db, 'activityRegistrations'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), registeredAt: toISO(d.data().registeredAt) } as ActivityRegistration)));
  });
}

export function subscribeToEscorts(activityId: string, cb: (escorts: ActivityEscort[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    cb(getStore().escorts.filter((e) => e.activityId === activityId));
    return () => {};
  }
  const q = query(collection(db, 'activityEscorts'), where('activityId', '==', activityId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), joinedAt: toISO(d.data().joinedAt) } as ActivityEscort)));
  });
}

export function subscribeToRegistrations(activityId: string, cb: (regs: ActivityRegistration[]) => void): Unsubscribe {
  if (!isFirebaseConfigured) {
    cb(getStore().registrations.filter((r) => r.activityId === activityId));
    return () => {};
  }
  const q = query(collection(db, 'activityRegistrations'), where('activityId', '==', activityId));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data(), registeredAt: toISO(d.data().registeredAt) } as ActivityRegistration)));
  });
}

// ─── ESCORTS ──────────────────────────────────────────────────────────────────

export async function getEscortsByActivity(activityId: string): Promise<ActivityEscort[]> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'activityEscorts'), where('activityId', '==', activityId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), joinedAt: toISO(d.data().joinedAt) } as ActivityEscort));
  }
  return getStore().escorts.filter((e) => e.activityId === activityId);
}

export async function addEscort(data: Omit<ActivityEscort, 'id' | 'joinedAt'>): Promise<ActivityEscort> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    const ref = await addDoc(collection(db, 'activityEscorts'), { ...data, joinedAt: serverTimestamp() });
    return { id: ref.id, ...data, joinedAt: now };
  }
  const store = getStore();
  const escort: ActivityEscort = { id: newId(), ...data, joinedAt: now };
  store.escorts.push(escort);
  saveStore(store);
  return escort;
}

export async function removeEscort(escortId: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'activityEscorts', escortId));
    return;
  }
  const store = getStore();
  store.escorts = store.escorts.filter((e) => e.id !== escortId);
  saveStore(store);
}

// ─── REGISTRATIONS ────────────────────────────────────────────────────────────

export async function getRegistrationsByActivity(activityId: string): Promise<ActivityRegistration[]> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'activityRegistrations'), where('activityId', '==', activityId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), registeredAt: toISO(d.data().registeredAt) } as ActivityRegistration));
  }
  return getStore().registrations.filter((r) => r.activityId === activityId);
}

export async function addRegistration(data: Omit<ActivityRegistration, 'id' | 'registeredAt'>): Promise<ActivityRegistration> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    const ref = await addDoc(collection(db, 'activityRegistrations'), { ...data, registeredAt: serverTimestamp() });
    return { id: ref.id, ...data, registeredAt: now };
  }
  const store = getStore();
  const reg: ActivityRegistration = { id: newId(), ...data, registeredAt: now };
  store.registrations.push(reg);
  saveStore(store);
  return reg;
}

export async function removeRegistration(regId: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'activityRegistrations', regId));
    return;
  }
  const store = getStore();
  store.registrations = store.registrations.filter((r) => r.id !== regId);
  saveStore(store);
}

export async function getAllEscorts(): Promise<ActivityEscort[]> {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'activityEscorts'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), joinedAt: toISO(d.data().joinedAt) } as ActivityEscort));
  }
  return getStore().escorts;
}

export async function getAllRegistrations(): Promise<ActivityRegistration[]> {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'activityRegistrations'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), registeredAt: toISO(d.data().registeredAt) } as ActivityRegistration));
  }
  return getStore().registrations;
}
