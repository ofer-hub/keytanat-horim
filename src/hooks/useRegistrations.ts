import { useState, useEffect, useCallback } from 'react';
import type { ActivityRegistration } from '../types';
import { subscribeToRegistrations, addRegistration, removeRegistration } from '../firebase/db';

export function useRegistrations(activityId: string) {
  const [registrations, setRegistrations] = useState<ActivityRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId) return;
    const unsub = subscribeToRegistrations(activityId, (data) => {
      setRegistrations(data);
      setLoading(false);
    });
    return unsub;
  }, [activityId]);

  const register = useCallback(async (data: Omit<ActivityRegistration, 'id' | 'registeredAt'>) => {
    // Duplicate check: already registered?
    if (registrations.some((r) => r.childId === data.childId)) {
      throw new Error('כבר נרשמת לפעילות זו');
    }
    return addRegistration(data);
  }, [registrations]);

  const unregister = useCallback(async (regId: string) => {
    return removeRegistration(regId);
  }, []);

  return { registrations, loading, register, unregister };
}
