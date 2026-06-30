import { useState } from 'react';
import { format, isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import type { Activity, ActivityEscort, ActivityRegistration } from '../../types';
import { buildWhatsAppMessage } from '../../utils/whatsapp';
import { updateActivity } from '../../firebase/db';

interface Props {
  activities: Activity[];
  allEscorts: ActivityEscort[];
  allRegistrations: ActivityRegistration[];
  onActivityUpdated: () => void;
}

export default function RemindersScreen({ activities, allEscorts, allRegistrations, onActivityUpdated }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const now = new Date();

  const relevant = activities.filter((a) => {
    const start = new Date(a.startDateTime);
    if (isToday(start) || isTomorrow(start)) return true;
    return false;
  }).sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const markSent = async (activity: Activity, type: 'evening' | 'halfhour') => {
    const data: Partial<Activity> = type === 'evening'
      ? { eveningReminderMarkedSent: true, eveningReminderMarkedSentAt: new Date().toISOString() }
      : { halfHourReminderMarkedSent: true, halfHourReminderMarkedSentAt: new Date().toISOString() };
    await updateActivity(activity.id, data);
    onActivityUpdated();
  };

  if (relevant.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-lg font-medium">אין פעילויות להיום או מחר</p>
        <p className="text-sm mt-1">תזכורות יופיעו כאן כשיהיה צורך</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-slate-800">📨 תזכורות לשליחה</h2>
      <p className="text-sm text-slate-500">
        העתק את ההודעה המוכנה ושלח בקבוצת הוואטסאפ של הקייטנה
      </p>

      {relevant.map((activity) => {
        const start = new Date(activity.startDateTime);
        const escorts = allEscorts.filter((e) => e.activityId === activity.id);
        const regs = allRegistrations.filter((r) => r.activityId === activity.id);
        const minutesToStart = differenceInMinutes(start, now);
        const isHappeningSoon = isToday(start) && minutesToStart <= 60 && minutesToStart > 0;
        const label = isToday(start) ? 'היום' : 'מחר';
        const timeStr = format(start, 'HH:mm');
        const dateStr = format(start, 'EEEE d/M', { locale: he });

        return (
          <div key={activity.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800">{activity.title}</h3>
                <p className="text-sm text-slate-500">{label} · {dateStr} · {timeStr}</p>
                <p className="text-xs text-slate-400">{activity.location}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                label === 'היום' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {label}
              </span>
            </div>

            <div className="text-xs text-slate-500">
              👦 {regs.length} ילדים · 🚗 {escorts.reduce((s, e) => s + e.seats, 0)} מקומות
            </div>

            {/* Evening reminder */}
            <div className={`border rounded-xl p-3 ${activity.eveningReminderMarkedSent ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">🌙 תזכורת ערב לפני</span>
                {activity.eveningReminderMarkedSent && (
                  <span className="text-xs text-green-600 font-semibold">✓ נשלח</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copy(buildWhatsAppMessage(activity, escorts, regs, 'evening'), `evening-${activity.id}`)}
                  className="flex-1 py-2 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
                >
                  {copiedId === `evening-${activity.id}` ? '✓ הועתק!' : '📋 העתק הודעה'}
                </button>
                {!activity.eveningReminderMarkedSent && (
                  <button
                    onClick={() => markSent(activity, 'evening')}
                    className="flex-1 py-2 rounded-lg border border-green-400 text-green-700 text-xs font-semibold hover:bg-green-50"
                  >
                    ✓ סמן כנשלח
                  </button>
                )}
              </div>
            </div>

            {/* Half hour reminder */}
            {(isToday(start) || isTomorrow(start)) && (
              <div className={`border rounded-xl p-3 ${activity.halfHourReminderMarkedSent ? 'border-green-200 bg-green-50' : isHappeningSoon ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">⏰ תזכורת חצי שעה לפני</span>
                  {activity.halfHourReminderMarkedSent && (
                    <span className="text-xs text-green-600 font-semibold">✓ נשלח</span>
                  )}
                  {isHappeningSoon && !activity.halfHourReminderMarkedSent && (
                    <span className="text-xs text-red-600 font-bold">עכשיו!</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copy(buildWhatsAppMessage(activity, escorts, regs, 'halfhour'), `half-${activity.id}`)}
                    className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600"
                  >
                    {copiedId === `half-${activity.id}` ? '✓ הועתק!' : '📋 העתק הודעה'}
                  </button>
                  {!activity.halfHourReminderMarkedSent && (
                    <button
                      onClick={() => markSent(activity, 'halfhour')}
                      className="flex-1 py-2 rounded-lg border border-orange-400 text-orange-700 text-xs font-semibold hover:bg-orange-50"
                    >
                      ✓ סמן כנשלח
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="text-xs text-center text-slate-400 pt-2 pb-4">
        האפליקציה מסייעת להכין תזכורות — השליחה היא ידנית דרך וואטסאפ
      </div>
    </div>
  );
}
