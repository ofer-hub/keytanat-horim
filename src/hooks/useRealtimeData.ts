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

export function useRealtimeData(isGuest: boolean): RealtimeData {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allEscorts, setAllEscorts] = useState<ActivityEscort[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<ActivityRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    setLoadedCount(0);
    setLoading(true);
    if (isGuest) {
      setAllEscorts([]);
      setAllRegistrations([]);
    }

    const unsub1 = subscribeToActivities((acts) => {
      setActivities(acts);
      setLoadedCount((c) => c + 1);
    });

    if (isGuest) return unsub1;

    const unsub2 = subscribeToAllEscorts((escorts) => {
      setAllEscorts(escorts);
      setLoadedCount((c) => c + 1);
    });
    const unsub3 = subscribeToAllRegistrations((regs) => {
      setAllRegistrations(regs);
      setLoadedCount((c) => c + 1);
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [isGuest]);

  useEffect(() => {
    if (loadedCount >= (isGuest ? 1 : 3)) setLoading(false);
  }, [loadedCount, isGuest]);

  return { activities, allEscorts, allRegistrations, loading };
}
