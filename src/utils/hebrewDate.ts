import { HDate, months, getSedra } from '@hebcal/core';

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
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];

function numToGematria(n: number): string {
  if (n === 15) return 'ט״ו';
  if (n === 16) return 'ט״ז';

  let result = '';
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;

  if (hundreds > 0) result += HUNDREDS[hundreds];
  if (tens > 0) result += TENS[tens];
  if (ones > 0) result += ONES[ones];

  if (result.length === 1) return result + '׳';
  if (result.length >= 2) {
    return result.slice(0, -1) + '״' + result.slice(-1);
  }
  return result;
}

const PARSHA_HE: Record<string, string> = {
  'Bereshit': 'בראשית', 'Noach': 'נח', 'Lech-Lecha': 'לך לך', 'Vayera': 'וירא',
  'Chayei Sara': 'חיי שרה', 'Toldot': 'תולדות', 'Vayetzei': 'ויצא', 'Vayishlach': 'וישלח',
  'Vayeshev': 'וישב', 'Miketz': 'מקץ', 'Vayigash': 'ויגש', 'Vayechi': 'ויחי',
  'Shemot': 'שמות', 'Vaera': 'וארא', 'Bo': 'בא', 'Beshalach': 'בשלח',
  'Yitro': 'יתרו', 'Mishpatim': 'משפטים', 'Terumah': 'תרומה', 'Tetzaveh': 'תצוה',
  'Ki Tisa': 'כי תשא', 'Vayakhel': 'ויקהל', 'Pekudei': 'פקודי', 'Vayikra': 'ויקרא',
  'Tzav': 'צו', 'Shmini': 'שמיני', 'Tazria': 'תזריע', 'Metzora': 'מצורע',
  'Achrei Mot': 'אחרי מות', 'Kedoshim': 'קדושים', 'Emor': 'אמור', 'Behar': 'בהר',
  'Bechukotai': 'בחוקותי', 'Bamidbar': 'במדבר', 'Nasso': 'נשא', "Beha'alotcha": 'בהעלותך',
  "Sh'lach": 'שלח', 'Korach': 'קורח', 'Chukat': 'חוקת', 'Balak': 'בלק',
  'Pinchas': 'פינחס', 'Matot': 'מטות', 'Masei': 'מסעי', 'Devarim': 'דברים',
  'Vaetchanan': 'ואתחנן', 'Eikev': 'עקב', "Re'eh": 'ראה', 'Shoftim': 'שופטים',
  'Ki Teitzei': 'כי תצא', 'Ki Tavo': 'כי תבוא', 'Nitzavim': 'נצבים', 'Vayeilech': 'וילך',
  "Ha'azinu": 'האזינו', 'Vezot Haberakhah': 'וזאת הברכה',
};

export function getParashaHebrew(date: Date): string {
  try {
    const hd = new HDate(date);
    const sedra = getSedra(hd.getFullYear(), true); // Israel schedule
    const result = sedra.lookup(hd);
    if (result.chag) return '';
    return result.parsha.map((p) => PARSHA_HE[p] ?? p).join('-');
  } catch {
    return '';
  }
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
