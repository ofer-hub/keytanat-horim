import { useState, useEffect, useCallback } from 'react';
import type { Activity } from '../types';
import { getActivities, createActivity, updateActivity, deleteActivity } from '../firebase/db';

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getActivities();
    setActivities(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const activity = await createActivity(data);
    setActivities((prev) => [...prev, activity]);
    return activity;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Activity>) => {
    await updateActivity(id, data);
    setActivities((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteActivity(id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { activities, loading, reload: load, createActivity: create, updateActivity: update, deleteActivity: remove };
}
