import type { Activity } from '../types';
import { format } from 'date-fns';

function toICSDate(isoStr: string): string {
  const d = new Date(isoStr);
  return format(d, "yyyyMMdd'T'HHmmss");
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICS(activity: Activity): string {
  const uid = `${activity.id}@keytanat-horim`;
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

  // 24h before alarm
  const alarm24 = `-PT24H`;
  // 30 min before alarm
  const alarm30 = `-PT30M`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Keytanat Horim Ariel//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toICSDate(activity.startDateTime)}`,
    `DTEND:${toICSDate(activity.endDateTime)}`,
    `SUMMARY:${escape(activity.title)}`,
    `LOCATION:${escape(activity.location)}`,
    `DESCRIPTION:${escape(activity.description || '')}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:תזכורת: ${escape(activity.title)}`,
    `TRIGGER:${alarm24}`,
    'END:VALARM',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:מתחיל בעוד 30 דקות: ${escape(activity.title)}`,
    `TRIGGER:${alarm30}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

export function downloadICS(activity: Activity): void {
  const content = generateICS(activity);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${activity.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
