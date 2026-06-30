import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import heLocale from '@fullcalendar/core/locales/he';

import type { Activity, ActivityEscort, ActivityRegistration } from '../../types';
import { generatePrayerEvents } from '../../utils/prayerEvents';
import { calculateActivityCoverage } from '../../utils/coverage';
import { toHebrewDateShort } from '../../utils/hebrewDate';
import { useAuth } from '../../context/AuthContext';

interface Props {
  activities: Activity[];
  allEscorts: ActivityEscort[];
  allRegistrations: ActivityRegistration[];
  onActivityClick: (activity: Activity) => void;
  onDateClick?: (date: Date) => void;
}

const prayerEvents = generatePrayerEvents();

function HebrewDayCell({ date }: { date: Date }) {
  const greg = `${date.getDate()}.${date.getMonth() + 1}`;
  const heb = toHebrewDateShort(date);
  return (
    <div className="hebrew-date-cell">
      <span className="hebrew-date-gregorian">{greg}</span>
      <span className="hebrew-date-hebrew">{heb}</span>
    </div>
  );
}

function EventContent({ info }: {
  info: EventContentArg;
  myChildIds?: string[];
  myParentId?: string;
}) {
  const { event } = info;
  const props = event.extendedProps;
  const isPrayer = props.isPrayer;
  const missing = props.needsAdditionalEscort;
  const isMyChild = props.myChildRegistered;
  const isMyEscort = props.myEscort;

  let cls = '';
  if (isPrayer) cls = 'event-prayer';
  else if (missing) cls = 'event-missing';
  else cls = 'event-covered';

  if (!isPrayer && isMyChild) cls += ' event-child-registered';
  if (!isPrayer && isMyEscort) cls += ' event-parent-escort';

  return (
    <div className={`fc-event ${cls} px-1 py-0.5 rounded text-white text-xs font-semibold truncate`}>
      {!isPrayer && missing && <span className="mr-1">🔴</span>}
      {event.title}
    </div>
  );
}

export default function CalendarView({ activities, allEscorts, allRegistrations, onActivityClick, onDateClick }: Props) {
  const { currentUser, isParent, isChild } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);
  void calendarRef; // kept for potential imperative API use
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const myChildIds = useMemo(() => {
    if (isChild && currentUser) return [currentUser.id];
    return [];
  }, [isChild, currentUser]);

  const myParentId = useMemo(() => {
    if (isParent && currentUser) return currentUser.id;
    return undefined;
  }, [isParent, currentUser]);

  const activityEvents = useMemo(() => {
    return activities.map((a) => {
      const escorts = allEscorts.filter((e) => e.activityId === a.id);
      const regs = allRegistrations.filter((r) => r.activityId === a.id);
      const coverage = calculateActivityCoverage(a, escorts, regs);
      const myChildRegistered = myChildIds.some((cid) => regs.find((r) => r.childId === cid));
      const myEscort = myParentId ? escorts.some((e) => e.parentId === myParentId) : false;

      return {
        id: a.id,
        title: a.title,
        start: a.startDateTime,
        end: a.endDateTime,
        backgroundColor: coverage.needsAdditionalEscort ? '#dc2626' : '#16a34a',
        borderColor: coverage.needsAdditionalEscort ? '#dc2626' : '#16a34a',
        extendedProps: {
          activity: a,
          isPrayer: false,
          needsAdditionalEscort: coverage.needsAdditionalEscort,
          missingSeats: coverage.missingSeats,
          myChildRegistered,
          myEscort,
        },
      };
    });
  }, [activities, allEscorts, allRegistrations, myChildIds, myParentId]);

  const prayerCalEvents = useMemo(() => prayerEvents.map((p) => ({
    id: p.id,
    title: p.title,
    start: p.start,
    end: p.end,
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    extendedProps: { ...p.extendedProps, activity: null },
  })), []);

  const allEvents = useMemo(() => [...prayerCalEvents, ...activityEvents], [prayerCalEvents, activityEvents]);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const props = arg.event.extendedProps;
    if (props.isPrayer) return;
    if (props.activity) onActivityClick(props.activity as Activity);
  }, [onActivityClick]);

  const handleDateClick = useCallback((arg: { date: Date }) => {
    if (isParent && onDateClick) onDateClick(arg.date);
  }, [isParent, onDateClick]);

  return (
    <div className="p-2 md:p-4 flex-1 bg-white rounded-xl shadow-sm">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={isMobile ? 'timeGridDay' : 'dayGridMonth'}
        headerToolbar={{
          right: 'prev,next today',
          center: 'title',
          left: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        locale={heLocale}
        direction="rtl"
        firstDay={0}
        initialDate="2026-07-01"
        validRange={{ start: '2026-07-01', end: '2026-09-01' }}
        slotDuration="00:30:00"
        snapDuration="00:30:00"
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        height="auto"
        events={allEvents}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        dayCellContent={(arg) => <HebrewDayCell date={arg.date} />}
        eventContent={(info) => <EventContent info={info} />}
        dayMaxEvents={3}
        nowIndicator
        buttonText={{
          today: 'היום',
          month: 'חודש',
          week: 'שבוע',
          day: 'יום',
        }}
        dayCellClassNames={(arg) => {
          const dow = arg.date.getDay();
          if (dow === 5 || dow === 6) return ['bg-purple-50'];
          return [];
        }}
      />
    </div>
  );
}
