import { useState, useCallback } from 'react';
import type { ActivityRegistration } from '../types';
import { getRegistrationsByActivity, addRegistration, removeRegistration } from '../firebase/db';

export function useRegistrations(activityId: string) {
  const [registrations, setRegistrations] = useState<ActivityRegistration[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getRegistrationsByActivity(activityId);
    setRegistrations(data);
    setLoading(false);
  }, [activityId]);

  const register = useCallback(async (data: Omit<ActivityRegistration, 'id' | 'registeredAt'>) => {
    const reg = await addRegistration(data);
    setRegistrations((prev) => [...prev, reg]);
    return reg;
  }, []);

  const unregister = useCallback(async (regId: string) => {
    await removeRegistration(regId);
    setRegistrations((prev) => prev.filter((r) => r.id !== regId));
  }, []);

  return { registrations, loading, loadRegistrations: load, register, unregister, setRegistrations };
}
