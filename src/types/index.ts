export type UserRole = 'parent' | 'child';

export interface Parent {
  id: string;
  role: 'parent';
  firstName: string;
  lastName: string;
  phone: string;
  accessCode: string;
  familyId: string;
  createdAt: string;
}

export interface Child {
  id: string;
  role: 'child';
  firstName: string;
  lastName: string;
  phone: string;
  accessCode: string;
  familyId: string;
  createdByParentId: string;
  createdAt: string;
}

export type AppUser = Parent | Child;

export interface Activity {
  id: string;
  title: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
  location: string;
  description: string;
  createdByParentId: string;
  createdByParentName: string;
  createdAt: string;
  updatedAt: string;
  type: 'activity';
  eveningReminderMarkedSent: boolean;
  eveningReminderMarkedSentAt?: string;
  halfHourReminderMarkedSent: boolean;
  halfHourReminderMarkedSentAt?: string;
}

export interface ActivityEscort {
  id: string;
  activityId: string;
  parentId: string;
  parentName: string;
  phone: string;
  seats: number;
  isCreator: boolean;
  joinedAt: string;
}

export interface ActivityRegistration {
  id: string;
  activityId: string;
  childId: string;
  childName: string;
  familyId: string;
  registeredAt: string;
  registeredByUserId: string;
}

export interface CoverageResult {
  childCount: number;
  seatCount: number;
  missingSeats: number;
  needsAdditionalEscort: boolean;
}

export interface PrayerEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  type: 'prayer';
  extendedProps: {
    isPrayer: true;
    location: string;
  };
}
