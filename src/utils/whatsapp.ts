import type { Activity, ActivityEscort, ActivityRegistration } from '../types';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export function buildWhatsAppMessage(
  activity: Activity,
  escorts: ActivityEscort[],
  registrations: ActivityRegistration[],
  type: 'evening' | 'halfhour'
): string {
  const dateStr = format(new Date(activity.startDateTime), 'EEEE d/M', { locale: he });
  const timeStr = format(new Date(activity.startDateTime), 'HH:mm');
  const escortNames = escorts.map((e) => e.parentName).join(', ');
  const childNames = registrations.map((r) => r.childName).join(', ');

  if (type === 'evening') {
    return `📅 *תזכורת מקייטנת הורים אריאל*

מחר — *${dateStr}* בשעה *${timeStr}*
מתקיימת הפעילות: *${activity.title}*

📍 מיקום: ${activity.location}
${activity.description ? `📝 ${activity.description}\n` : ''}
👨‍👩‍👧 הורים מלווים: ${escortNames || 'טרם נקבעו'}
👦 ילדים רשומים: ${childNames || 'טרם נרשמו'}

נא להגיע בזמן 😊`;
  }

  return `⏰ *תזכורת – מתחיל בקרוב!*

בעוד כחצי שעה — *${activity.title}*
בשעה *${timeStr}* ב-${activity.location}

👦 ילדים רשומים: ${childNames || 'טרם נרשמו'}
👨‍👩‍👧 הורים מלווים: ${escortNames || 'טרם נקבעו'}

נסיעה טובה! 🚗`;
}
