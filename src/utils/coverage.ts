import type { Activity, ActivityEscort, ActivityRegistration, CoverageResult } from '../types';

export function calculateActivityCoverage(
  _activity: Activity,
  escorts: ActivityEscort[],
  registrations: ActivityRegistration[]
): CoverageResult {
  const childCount = registrations.length;
  const seatCount = escorts.reduce((sum, e) => sum + (e.seats || 0), 0);
  const missingSeats = Math.max(0, childCount - seatCount);
  const needsAdditionalEscort = childCount > seatCount;

  return { childCount, seatCount, missingSeats, needsAdditionalEscort };
}
