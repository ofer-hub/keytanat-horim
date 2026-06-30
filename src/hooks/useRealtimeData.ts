import { useState, useEffect } from 'react';
import type { Activity, ActivityEscort, ActivityRegistration } from '../types';
import {
  subscribeToActivities,
  subscribeToAllEscorts,
  subscribeToAllRegistrations,
} from '../firebase/db';

export interface RealtimeData {
  activities: Activity[];
  allEscorts: ActivityEscort[];
  allRegistrations: ActivityRegistration[];
  loading: boolean;
}

/**
 * Central real-time subscription for the calendar view.
 * All three collections are kept in sync via onSnapshot.
 */
export function useRealtimeData(): RealtimeData {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allEscorts, setAllEscorts] = useState<ActivityEscort[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<ActivityRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    const unsub1 = subscribeToActivities((acts) => {
      setActivities(acts);
      setLoadedCount((c) => c + 1);
    });
    const unsub2 = subscribeToAllEscorts((escorts) => {
      setAllEscorts(escorts);
      setLoadedCount((c) => c + 1);
    });
    const unsub3 = subscribeToAllRegistrations((regs) => {
      setAllRegistrations(regs);
      setLoadedCount((c) => c + 1);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  useEffect(() => {
    if (loadedCount >= 3) setLoading(false);
  }, [loadedCount]);

  return { activities, allEscorts, allRegistrations, loading };
}
