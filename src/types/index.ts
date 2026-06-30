export type UserRole = 'parent' | 'child';

export interface Parent {
  id: string;       // Firebase UID (anonymous)
  uid: string;      // same as id
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
  uid: string;
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
  startDateTime: string;
  endDateTime: string;
  location: string;
  description: string;
  createdByParentId: string;   // uid of creator
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
  parentId: string;    // uid
  parentName: string;
  phone: string;
  seats: number;
  isCreator: boolean;
  joinedAt: string;
}

export interface ActivityRegistration {
  id: string;
  activityId: string;
  childId: string;     // uid
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

// Phone index entry (for cross-device login)
export interface PhoneIndex {
  uid: string;
  accessCode: string;
  role: UserRole;
}
