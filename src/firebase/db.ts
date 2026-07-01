import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, Timestamp, increment,
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
  users: AppUser[];
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
  data: Omit<Parent | Child, 'id' | 'uid' | 'createdAt'>
): Promise<Parent | Child> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    // accessCode stays in phoneIndex only — never written to the users doc
    const { accessCode, ...profileData } = data as Record<string, unknown>;
    await setDoc(doc(db, 'users', uid), { ...profileData, uid, createdAt: serverTimestamp() });
    await setDoc(doc(db, 'phoneIndex', data.phone), {
      uid,
      accessCode: accessCode ?? '',
      role: data.role,
    });
    // Return includes accessCode so it can be stored in the localStorage session
    return { id: uid, uid, ...data, createdAt: now } as Parent | Child;
  }
  const store = getStore();
  const user = { id: uid, uid, ...data, createdAt: now } as Parent | Child;
  store.users = store.users.filter((u) => u.id !== uid);
  store.users.push(user);
  store.phoneIndex[data.phone] = { uid, accessCode: data.accessCode ?? '', role: data.role };
  saveStore(store);
  return user;
}

/** Restore profile on new device (cross-device login: creates users/{newUid}, phoneIndex stays). */
export async function migratePhoneToUid(phone: string, newUid: string, existingData: Parent | Child): Promise<void> {
  if (isFirebaseConfigured) {
    // Strip accessCode — never write it to the users doc
    const { accessCode: _dropped, ...safeProfile } = existingData as unknown as Record<string, unknown>;
    void _dropped;
    await setDoc(doc(db, 'users', newUid), { ...safeProfile, uid: newUid, updatedAt: serverTimestamp() });
    // phoneIndex is NOT updated — rules block it (update: if false)
    // phoneIndex will keep pointing to the original device's uid
    return;
  }
  const store = getStore();
  store.users = store.users.filter((u) => u.id !== existingData.id);
  store.users.push({ ...existingData, id: newUid, uid: newUid });
  const existingEntry = store.phoneIndex[phone];
  store.phoneIndex[phone] = {
    uid: newUid,
    accessCode: existingData.accessCode ?? existingEntry?.accessCode ?? '',
    role: existingData.role,
  };
  saveStore(store);
}

export async function createAdminUser(uid: string, phone: string): Promise<AppUser> {
  const now = nowISO();
  const data = { role: 'admin' as const, firstName: 'מנהל', lastName: 'מערכת', phone, familyId: 'admin' };
  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', uid), { ...data, uid, createdAt: serverTimestamp() });
    return { id: uid, uid, ...data, createdAt: now };
  }
  const store = getStore();
  const user: AppUser = { id: uid, uid, ...data, createdAt: now };
  store.users = store.users.filter((u) => u.id !== uid);
  store.users.push(user);
  saveStore(store);
  return user;
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
    childCount: typeof data.childCount === 'number' ? data.childCount : 0,
    seatCount: typeof data.seatCount === 'number' ? data.seatCount : 0,
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
    const ref = await addDoc(collection(db, 'activities'), {
      ...data, childCount: 0, seatCount: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    return { id: ref.id, ...data, childCount: 0, seatCount: 0, createdAt: now, updatedAt: now };
  }
  const store = getStore();
  const activity: Activity = { id: newId(), ...data, childCount: 0, seatCount: 0, createdAt: now, updatedAt: now };
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
    await updateDoc(doc(db, 'activities', data.activityId), { seatCount: increment(data.seats) });
    return { id: ref.id, ...data, joinedAt: now };
  }
  const store = getStore();
  const escort: ActivityEscort = { id: newId(), ...data, joinedAt: now };
  store.escorts.push(escort);
  const ai = store.activities.findIndex((a) => a.id === data.activityId);
  if (ai >= 0) store.activities[ai].seatCount = (store.activities[ai].seatCount ?? 0) + data.seats;
  saveStore(store);
  return escort;
}

export async function removeEscort(escortId: string): Promise<void> {
  if (isFirebaseConfigured) {
    const ref = doc(db, 'activityEscorts', escortId);
    const snap = await getDoc(ref);
    await deleteDoc(ref);
    if (snap.exists()) {
      const d = snap.data() as { activityId: string; seats: number };
      await updateDoc(doc(db, 'activities', d.activityId), { seatCount: increment(-d.seats) });
    }
    return;
  }
  const store = getStore();
  const escort = store.escorts.find((e) => e.id === escortId);
  if (escort) {
    const ai = store.activities.findIndex((a) => a.id === escort.activityId);
    if (ai >= 0) store.activities[ai].seatCount = Math.max(0, (store.activities[ai].seatCount ?? 0) - escort.seats);
  }
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
    await updateDoc(doc(db, 'activities', data.activityId), { childCount: increment(1) });
    return { id: ref.id, ...data, registeredAt: now };
  }
  const store = getStore();
  const reg: ActivityRegistration = { id: newId(), ...data, registeredAt: now };
  store.registrations.push(reg);
  const ai = store.activities.findIndex((a) => a.id === data.activityId);
  if (ai >= 0) store.activities[ai].childCount = (store.activities[ai].childCount ?? 0) + 1;
  saveStore(store);
  return reg;
}

export async function removeRegistration(regId: string): Promise<void> {
  if (isFirebaseConfigured) {
    const ref = doc(db, 'activityRegistrations', regId);
    const snap = await getDoc(ref);
    await deleteDoc(ref);
    if (snap.exists()) {
      const d = snap.data() as { activityId: string };
      await updateDoc(doc(db, 'activities', d.activityId), { childCount: increment(-1) });
    }
    return;
  }
  const store = getStore();
  const reg = store.registrations.find((r) => r.id === regId);
  if (reg) {
    const ai = store.activities.findIndex((a) => a.id === reg.activityId);
    if (ai >= 0) store.activities[ai].childCount = Math.max(0, (store.activities[ai].childCount ?? 0) - 1);
  }
  store.registrations = store.registrations.filter((r) => r.id !== regId);
  saveStore(store);
}

// ─── ADMIN OPERATIONS ────────────────────────────────────────────────────────

export async function adminDeleteUser(uid: string, phone: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'users', uid));
    await deleteDoc(doc(db, 'phoneIndex', phone));
    return;
  }
  const store = getStore();
  store.users = store.users.filter((u) => u.id !== uid);
  delete store.phoneIndex[phone];
  saveStore(store);
}

export async function adminUpdateUser(uid: string, data: { firstName: string; lastName: string }): Promise<void> {
  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'users', uid), data);
    return;
  }
  const store = getStore();
  const idx = store.users.findIndex((u) => u.id === uid);
  if (idx >= 0) store.users[idx] = { ...store.users[idx], ...data };
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
