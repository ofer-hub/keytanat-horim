import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import type { Parent, Child, Activity, ActivityEscort, ActivityRegistration } from '../types';

// --- LocalStorage fallback store ---
type Store = {
  parents: Parent[];
  children: Child[];
  activities: Activity[];
  escorts: ActivityEscort[];
  registrations: ActivityRegistration[];
};

function getStore(): Store {
  try {
    const raw = localStorage.getItem('keytanat_store');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { parents: [], children: [], activities: [], escorts: [], registrations: [] };
}

function saveStore(s: Store): void {
  localStorage.setItem('keytanat_store', JSON.stringify(s));
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowISO(): string {
  return new Date().toISOString();
}

// Convert Firebase Timestamp or string to ISO string
function toISO(val: unknown): string {
  if (!val) return nowISO();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return nowISO();
}

// ============ PARENTS ============

export async function getParentByPhone(phone: string): Promise<Parent | null> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'parents'), where('phone', '==', phone));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as Parent;
  }
  const store = getStore();
  return store.parents.find((p) => p.phone === phone) ?? null;
}

export async function createParent(data: Omit<Parent, 'id' | 'createdAt'>): Promise<Parent> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    const ref = await addDoc(collection(db, 'parents'), { ...data, createdAt: serverTimestamp() });
    return { id: ref.id, ...data, createdAt: now };
  }
  const store = getStore();
  const parent: Parent = { id: newId(), ...data, createdAt: now };
  store.parents.push(parent);
  saveStore(store);
  return parent;
}

export async function getParentById(id: string): Promise<Parent | null> {
  if (isFirebaseConfigured) {
    const snap = await getDoc(doc(db, 'parents', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data(), createdAt: toISO(snap.data().createdAt) } as Parent;
  }
  const store = getStore();
  return store.parents.find((p) => p.id === id) ?? null;
}

export async function getAllParents(): Promise<Parent[]> {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'parents'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as Parent));
  }
  return getStore().parents;
}

// ============ CHILDREN ============

export async function getChildByPhone(phone: string): Promise<Child | null> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'children'), where('phone', '==', phone));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as Child;
  }
  const store = getStore();
  return store.children.find((c) => c.phone === phone) ?? null;
}

export async function createChild(data: Omit<Child, 'id' | 'createdAt'>): Promise<Child> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    const ref = await addDoc(collection(db, 'children'), { ...data, createdAt: serverTimestamp() });
    return { id: ref.id, ...data, createdAt: now };
  }
  const store = getStore();
  const child: Child = { id: newId(), ...data, createdAt: now };
  store.children.push(child);
  saveStore(store);
  return child;
}

export async function getChildrenByParent(parentId: string): Promise<Child[]> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'children'), where('createdByParentId', '==', parentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toISO(d.data().createdAt) } as Child));
  }
  return getStore().children.filter((c) => c.createdByParentId === parentId);
}

// ============ ACTIVITIES ============

export async function getActivities(): Promise<Activity[]> {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'activities'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        startDateTime: toISO(data.startDateTime),
        endDateTime: toISO(data.endDateTime),
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
      } as Activity;
    });
  }
  return getStore().activities;
}

export async function createActivity(data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
  const now = nowISO();
  if (isFirebaseConfigured) {
    const ref = await addDoc(collection(db, 'activities'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
  if (idx >= 0) {
    store.activities[idx] = { ...store.activities[idx], ...data, updatedAt: now };
    saveStore(store);
  }
}

export async function deleteActivity(id: string): Promise<void> {
  if (isFirebaseConfigured) {
    await deleteDoc(doc(db, 'activities', id));
    // Also clean up escorts and registrations
    const eq = query(collection(db, 'activityEscorts'), where('activityId', '==', id));
    const eSnap = await getDocs(eq);
    for (const d of eSnap.docs) await deleteDoc(d.ref);
    const rq = query(collection(db, 'activityRegistrations'), where('activityId', '==', id));
    const rSnap = await getDocs(rq);
    for (const d of rSnap.docs) await deleteDoc(d.ref);
    return;
  }
  const store = getStore();
  store.activities = store.activities.filter((a) => a.id !== id);
  store.escorts = store.escorts.filter((e) => e.activityId !== id);
  store.registrations = store.registrations.filter((r) => r.activityId !== id);
  saveStore(store);
}

// ============ ESCORTS ============

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

// ============ REGISTRATIONS ============

export async function getRegistrationsByActivity(activityId: string): Promise<ActivityRegistration[]> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'activityRegistrations'), where('activityId', '==', activityId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), registeredAt: toISO(d.data().registeredAt) } as ActivityRegistration));
  }
  return getStore().registrations.filter((r) => r.activityId === activityId);
}

export async function getRegistrationsByChild(childId: string): Promise<ActivityRegistration[]> {
  if (isFirebaseConfigured) {
    const q = query(collection(db, 'activityRegistrations'), where('childId', '==', childId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), registeredAt: toISO(d.data().registeredAt) } as ActivityRegistration));
  }
  return getStore().registrations.filter((r) => r.childId === childId);
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

export async function getAllRegistrations(): Promise<ActivityRegistration[]> {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'activityRegistrations'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), registeredAt: toISO(d.data().registeredAt) } as ActivityRegistration));
  }
  return getStore().registrations;
}

export async function getAllEscorts(): Promise<ActivityEscort[]> {
  if (isFirebaseConfigured) {
    const snap = await getDocs(collection(db, 'activityEscorts'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), joinedAt: toISO(d.data().joinedAt) } as ActivityEscort));
  }
  return getStore().escorts;
}
