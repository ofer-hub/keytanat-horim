import type { PrayerEvent } from '../types';

function dateStr(date: Date, hour: number, minute: number): string {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function addMinutes(isoStr: string, minutes: number): string {
  const d = new Date(isoStr);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function generatePrayerEvents(): PrayerEvent[] {
  const events: PrayerEvent[] = [];

  const start = new Date('2026-07-01');
  const end = new Date('2026-08-31');

  const current = new Date(start);
  let idx = 0;

  // Fast days — skip regular prayer schedule
  const isFastDay = (d: Date) => {
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return (m === 7 && day === 2) || (m === 7 && day === 23); // 17 Tammuz & 9 Av 5786
  };

  while (current <= end) {
    const dow = current.getDay(); // 0=Sun, 5=Fri, 6=Sat

    if (dow !== 5 && dow !== 6 && !isFastDay(current)) {
      // שחרית + שיעור — every day except Fri/Sat
      const shachStart = dateStr(current, 8, 15);
      events.push({
        id: `shacharit-${idx++}`,
        title: 'שחרית ושיעור – בית כנסת שבות אריאל',
        start: shachStart,
        end: addMinutes(shachStart, 60),
        location: 'בית כנסת שבות אריאל',
        type: 'prayer',
        extendedProps: { isPrayer: true, location: 'בית כנסת שבות אריאל' },
      });

      // מנחה — every day except Fri/Sat
      const minchaStart = dateStr(current, 13, 20);
      events.push({
        id: `mincha-${idx++}`,
        title: 'מנחה – בית כנסת אורות',
        start: minchaStart,
        end: addMinutes(minchaStart, 20),
        location: 'בית כנסת אורות',
        type: 'prayer',
        extendedProps: { isPrayer: true, location: 'בית כנסת אורות' },
      });

      // ערבית
      if (dow === 2) {
        // שלישי — ערבית + שיעור גמרא בשבות אריאל
        const maarivStart = dateStr(current, 20, 0);
        events.push({
          id: `maariv-tue-${idx++}`,
          title: 'ערבית ושיעור גמרא של הרב רן קעטבי – שבות אריאל',
          start: maarivStart,
          end: addMinutes(maarivStart, 60),
          location: 'בית כנסת שבות אריאל',
          type: 'prayer',
          extendedProps: { isPrayer: true, location: 'בית כנסת שבות אריאל' },
        });
      } else {
        // כל שאר הימים (לא שלישי, לא שישי, לא שבת)
        const maarivStart = dateStr(current, 20, 0);
        events.push({
          id: `maariv-${idx++}`,
          title: 'ערבית – בית כנסת אורות',
          start: maarivStart,
          end: addMinutes(maarivStart, 20),
          location: 'בית כנסת אורות',
          type: 'prayer',
          extendedProps: { isPrayer: true, location: 'בית כנסת אורות' },
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  // Fast days — all-day banner events
  events.push({
    id: 'fast-17tammuz',
    title: 'צום י״ז בתמוז',
    start: '2026-07-02',
    end: '2026-07-03',
    location: '',
    type: 'prayer',
    extendedProps: { isPrayer: true, location: '', isFastDay: true },
  });
  events.push({
    id: 'fast-9av',
    title: 'צום ט׳ באב',
    start: '2026-07-23',
    end: '2026-07-24',
    location: '',
    type: 'prayer',
    extendedProps: { isPrayer: true, location: '', isFastDay: true },
  });

  return events;
}
