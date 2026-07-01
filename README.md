# קייטנת הורים אריאל

אפליקציית ניהול פעילויות לחופש הגדול תשפ״ו — יולי–אוגוסט 2026.  
מיועדת לכ-13 ילדי כיתה ז׳ בעיר אריאל ומשפחותיהם.

## הפעלה מקומית

```bash
npm install
npm run dev
```

האפליקציה תעבוד גם ללא Firebase — תשמור נתונים ב-`localStorage` (מצב demo).

## חיבור Firebase (לשיתוף אמיתי בין מכשירים)

### 1. צור פרויקט Firebase

- פתח את [Firebase Console](https://console.firebase.google.com)
- צור פרויקט חדש (Spark Plan = חינמי לגמרי)

### 2. הפעל שירותים

ב-Firebase Console:
- **Authentication** → Sign-in method → **Anonymous** → Enable
- **Firestore Database** → Create database → Start in **production mode**

### 3. הגדר Firestore Rules

ב-Firestore → Rules, הכנס את תוכן `firestore.rules` מהפרויקט.

> ⚠️ **אל תשתמש ב-`allow read, write: if true`!**  
> הקובץ `firestore.rules` בפרויקט כולל rules מאובטחות.

### 4. צור קובץ .env.local

```bash
cp .env.local.example .env.local
```

מלא את הערכים מ-Firebase Console → Project Settings → Your apps → Web app:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# מנהל המערכת
VITE_ADMIN_PHONE=05X-XXXXXXX
VITE_ADMIN_CODE=קוד-שתבחר
```

> ⚠️ **לעולם אל תכניס `.env.local` ל-Git!** הוא ב-`.gitignore`.

## פריסה ב-Vercel

1. Push לגיטהאב
2. חבר Vercel לרפו
3. הוסף את כל משתני ה-`VITE_*` ב-Vercel Dashboard → Settings → Environment Variables
4. פרוס

## משתני סביבה נדרשים

| שם | תיאור |
|----|--------|
| `VITE_FIREBASE_API_KEY` | Firebase API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_ADMIN_PHONE` | מספר טלפון של מנהל המערכת |
| `VITE_ADMIN_CODE` | קוד כניסה של מנהל המערכת |

## כניסה למערכת

- **אורח** — רואה את הלוח ללא הרשמה
- **הורה חדש** — מזין טלפון, שם, ובוחר קוד כניסה אישי
- **הורה חוזר** — טלפון + קוד אישי שבחר בהרשמה
- **ילד** — נרשם ע"י הורה עם טלפון וקוד אישי; כניסה: טלפון + קוד
- **אדמין** — כניסה עם `VITE_ADMIN_PHONE` + `VITE_ADMIN_CODE`

## ארכיטקטורה

- **React 19 + TypeScript + Vite**
- **FullCalendar v6** — לוח עם RTL עברי
- **@hebcal/core** — תאריכים עבריים
- **Firebase** — Anonymous Auth + Firestore Realtime
- **Tailwind CSS v3**
- **PWA** — manifest + אייקון + meta tags

## אבטחה

- Firebase Anonymous Auth מגן על כל הנתונים
- Firestore Rules מגבילים פעולות לפי תפקיד (הורה/ילד/אדמין)
- אין קוד קבוצתי — כל משתמש בוחר קוד אישי בהרשמה
- `accessCode` נשמר ב-`phoneIndex` בלבד, לא בפרופיל המשתמש
- לא נשמרים secrets ב-Git
- אין API בתשלום בשום מקום

## מגבלות ידועות

- UID של Anonymous Auth אינו יציב אם המשתמש מנקה את הדפדפן (פתרון: הרשמה מחדש)
- Bundle גדול (~1.1MB) — FullCalendar + Firebase; לא חוסם פונקציונליות
- Push notifications לא ממומשות — תזכורות הן ידניות
