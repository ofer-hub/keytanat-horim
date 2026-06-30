import { useState, useCallback } from 'react';
import type { ActivityEscort } from '../types';
import { getEscortsByActivity, addEscort, removeEscort } from '../firebase/db';

export function useEscorts(activityId: string) {
  const [escorts, setEscorts] = useState<ActivityEscort[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getEscortsByActivity(activityId);
    setEscorts(data);
    setLoading(false);
  }, [activityId]);

  const join = useCallback(async (data: Omit<ActivityEscort, 'id' | 'joinedAt'>) => {
    const escort = await addEscort(data);
    setEscorts((prev) => [...prev, escort]);
    return escort;
  }, []);

  const leave = useCallback(async (escortId: string, isCreator: boolean) => {
    if (isCreator) throw new Error('ההורה היוזם לא יכול להסיר את עצמו מהפעילות');
    await removeEscort(escortId);
    setEscorts((prev) => prev.filter((e) => e.id !== escortId));
  }, []);

  return { escorts, loading, loadEscorts: load, joinEscort: join, leaveEscort: leave, setEscorts };
}
