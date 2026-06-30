import { HDate, months } from '@hebcal/core';

const HEBREW_MONTHS: Record<number, string> = {
  [months.NISAN]: 'ניסן',
  [months.IYYAR]: 'אייר',
  [months.SIVAN]: 'סיוון',
  [months.TAMUZ]: 'תמוז',
  [months.AV]: 'אב',
  [months.ELUL]: 'אלול',
  [months.TISHREI]: 'תשרי',
  [months.CHESHVAN]: 'חשוון',
  [months.KISLEV]: 'כסלו',
  [months.TEVET]: 'טבת',
  [months.SHVAT]: 'שבט',
  [months.ADAR_I]: 'אדר א׳',
  [months.ADAR_II]: 'אדר ב׳',
};

const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];

function numToGematria(n: number): string {
  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';

  let result = '';
  const tens = Math.floor(n / 10);
  const ones = n % 10;

  if (tens > 0) result += TENS[tens];
  if (ones > 0) result += ONES[ones];

  if (result.length === 1) return result + '׳';
  if (result.length >= 2) {
    return result.slice(0, -1) + '״' + result.slice(-1);
  }
  return result;
}

export function toHebrewDateShort(date: Date): string {
  try {
    const hd = new HDate(date);
    const day = hd.getDate();
    const month = hd.getMonth();
    const monthName = HEBREW_MONTHS[month] ?? '';
    return `${numToGematria(day)} ${monthName}`;
  } catch {
    return '';
  }
}

export function toHebrewDateFull(date: Date): string {
  try {
    const hd = new HDate(date);
    const day = hd.getDate();
    const month = hd.getMonth();
    const year = hd.getFullYear();
    const monthName = HEBREW_MONTHS[month] ?? '';
    return `${numToGematria(day)} ${monthName} ${numToGematria(year % 1000)}`;
  } catch {
    return '';
  }
}
