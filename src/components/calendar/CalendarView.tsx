import { useMemo, useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import heLocale from '@fullcalendar/core/locales/he';

import type { Activity, ActivityEscort, ActivityRegistration } from '../../types';
import { generatePrayerEvents } from '../../utils/prayerEvents';
import { calculateActivityCoverage } from '../../utils/coverage';
import { toHebrewDateShort, getParashaHebrew } from '../../utils/hebrewDate';
import { useAuth } from '../../context/AuthContext';

interface Props {
  activities: Activity[];
  allEscorts: ActivityEscort[];
  allRegistrations: ActivityRegistration[];
  onActivityClick: (activity: Activity) => void;
  onDateClick?: (date: Date) => void;
  onNavigatedToDate?: (date: Date) => void;
  isGuest?: boolean;
}

export interface CalendarViewHandle {
  goToMonth: () => void;
}

const prayerEvents = generatePrayerEvents();

function HebrewDayCell({ date }: { date: Date }) {
  const greg = `${date.getDate()}.${date.getMonth() + 1}`;
  const heb = toHebrewDateShort(date);
  const isSat = date.getDay() === 6;
  const parasha = isSat ? getParashaHebrew(date) : '';
  return (
    <div className="hebrew-date-cell">
      <span className="hebrew-date-gregorian">{greg}</span>
      <span className="hebrew-date-hebrew">{heb}</span>
      {parasha && <span className="parasha-name">{parasha}</span>}
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
  if (isPrayer && props.isFastDay) cls = 'event-fast-day';
  else if (isPrayer) cls = 'event-prayer';
  else if (missing) cls = 'event-missing';
  else cls = 'event-covered';

  if (!isPrayer && isMyChild) cls += ' event-child-registered';
  if (!isPrayer && isMyEscort) cls += ' event-parent-escort';

  const timeLabel = !event.allDay && event.start
    ? `${String(event.start.getHours()).padStart(2, '0')}:${String(event.start.getMinutes()).padStart(2, '0')} `
    : '';

  return (
    <div className={`fc-event ${cls} px-1 py-0.5 rounded text-white text-xs font-semibold truncate`}>
      {!isPrayer && missing && <span className="mr-1">🔴</span>}
      {timeLabel}{event.title}
    </div>
  );
}

const CalendarView = forwardRef<CalendarViewHandle, Props>(function CalendarView(
  { activities, allEscorts, allRegistrations, onActivityClick, onDateClick, onNavigatedToDate, isGuest },
  ref
) {
  const { currentUser, isParent, isChild } = useAuth();
  const calendarRef = useRef<FullCalendar>(null);

  useImperativeHandle(ref, () => ({
    goToMonth: () => calendarRef.current?.getApi().changeView('dayGridMonth'),
  }));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [currentView, setCurrentView] = useState(() => window.innerWidth < 640 ? 'timeGridDay' : 'dayGridMonth');

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
      const coverage = isGuest
        ? {
            childCount: a.childCount ?? 0,
            seatCount: a.seatCount ?? 0,
            missingSeats: Math.max(0, (a.childCount ?? 0) - (a.seatCount ?? 0)),
            needsAdditionalEscort: (a.childCount ?? 0) > (a.seatCount ?? 0),
          }
        : calculateActivityCoverage(a, escorts, regs);
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

  const prayerCalEvents = useMemo(() => prayerEvents.map((p) => {
    const isFast = p.extendedProps.isFastDay;
    return {
      id: p.id,
      title: p.title,
      start: p.start,
      end: p.end,
      ...(isFast ? { allDay: true } : {}),
      backgroundColor: isFast ? '#6b7280' : '#3b82f6',
      borderColor: isFast ? '#4b5563' : '#3b82f6',
      extendedProps: { ...p.extendedProps, activity: null },
    };
  }), []);

  const allEvents = useMemo(() => [...prayerCalEvents, ...activityEvents], [prayerCalEvents, activityEvents]);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const props = arg.event.extendedProps;
    if (props.isPrayer) return;
    if (props.activity) onActivityClick(props.activity as Activity);
  }, [onActivityClick]);

  const handleDateClick = useCallback((arg: { date: Date; view: { type: string } }) => {
    if (arg.view.type === 'dayGridMonth') {
      onNavigatedToDate?.(arg.date);
      calendarRef.current?.getApi().changeView('timeGridDay', arg.date);
    } else if (isParent && onDateClick) {
      onDateClick(arg.date);
    }
  }, [isParent, onDateClick, onNavigatedToDate]);

  const goToMonth = useCallback(() => {
    calendarRef.current?.getApi().changeView('dayGridMonth');
  }, []);

  return (
    <div className="p-2 md:p-4 flex-1 bg-white rounded-xl shadow-sm">
      {currentView !== 'dayGridMonth' && (
        <div className="flex justify-end mb-2">
          <button
            onClick={goToMonth}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            חזרה לתצוגת חודש ›
          </button>
        </div>
      )}
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
        datesSet={(arg) => setCurrentView(arg.view.type)}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        dayCellContent={(arg) => <HebrewDayCell date={arg.date} />}
        eventContent={(info) => <EventContent info={info} />}
        dayMaxEvents={true}
        nowIndicator
        buttonText={{
          today: 'היום',
          month: 'חודש',
          week: 'שבוע',
          day: 'יום',
        }}
        dayCellClassNames={(arg) => {
          const m = arg.date.getMonth() + 1;
          const d = arg.date.getDate();
          if ((m === 7 && d === 2) || (m === 7 && d === 23)) return ['fast-day-cell'];
          return [];
        }}
      />
    </div>
  );
});

export default CalendarView;
