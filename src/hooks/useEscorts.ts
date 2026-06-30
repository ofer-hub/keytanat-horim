import { useState, useEffect, useCallback } from 'react';
import type { ActivityEscort } from '../types';
import { subscribeToEscorts, addEscort, removeEscort } from '../firebase/db';

export function useEscorts(activityId: string) {
  const [escorts, setEscorts] = useState<ActivityEscort[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    const unsub = subscribeToEscorts(activityId, (data) => {
      setEscorts(data);
      setLoading(false);
    });
    return unsub;
  }, [activityId]);

  const joinEscort = useCallback(async (data: Omit<ActivityEscort, 'id' | 'joinedAt'>) => {
    // Duplicate check: already escorting?
    if (escorts.some((e) => e.parentId === data.parentId)) {
      throw new Error('כבר נרשמת כהורה מלווה לפעילות זו');
    }
    return addEscort(data);
  }, [escorts]);

  const leaveEscort = useCallback(async (escortId: string, isCreator: boolean) => {
    if (isCreator) throw new Error('ההורה היוזם לא יכול לעזוב את הפעילות');
    return removeEscort(escortId);
  }, []);

  return { escorts, loading, joinEscort, leaveEscort };
}
