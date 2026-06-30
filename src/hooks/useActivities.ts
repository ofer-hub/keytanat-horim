import { useCallback } from 'react';
import type { Activity } from '../types';
import { createActivity, updateActivity, deleteActivity } from '../firebase/db';

/** Write-only operations for activities (reads come from useRealtimeData) */
export function useActivityActions() {
  const create = useCallback(async (data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    return createActivity(data);
  }, []);

  const update = useCallback(async (id: string, data: Partial<Activity>) => {
    return updateActivity(id, data);
  }, []);

  const remove = useCallback(async (id: string) => {
    return deleteActivity(id);
  }, []);

  return { createActivity: create, updateActivity: update, deleteActivity: remove };
}
