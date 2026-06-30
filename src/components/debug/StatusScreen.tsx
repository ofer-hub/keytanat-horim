import { isFirebaseConfigured } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { calculateActivityCoverage } from '../../utils/coverage';
import type { Activity, ActivityEscort, ActivityRegistration } from '../../types';

interface Props {
  activitiesCount: number;
  registrationsCount: number;
  activities: Activity[];
  allEscorts: ActivityEscort[];
  allRegistrations: ActivityRegistration[];
  onBack: () => void;
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold flex items-center gap-1 ${ok === true ? 'text-emerald-600' : ok === false ? 'text-red-600' : 'text-slate-700'}`}>
        {ok === true && '✓ '}{ok === false && '✗ '}{value}
      </span>
    </div>
  );
}

export default function StatusScreen({ activitiesCount, registrationsCount, activities, allEscorts, allRegistrations, onBack }: Props) {
  const { currentUser, firebaseUid } = useAuth();

  const activitiesMissing = activities.filter((a) => {
    const escorts = allEscorts.filter((e) => e.activityId === a.id);
    const regs = allRegistrations.filter((r) => r.activityId === a.id);
    return calculateActivityCoverage(a, escorts, regs).needsAdditionalEscort;
  });

  const isLocalMode = !isFirebaseConfigured;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-xl font-bold text-slate-800">⚙️ בדיקת מוכנות</h1>
      </div>

      {/* Firebase */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h2 className="font-bold text-slate-700 mb-2">🔥 Firebase</h2>
        <Row label="Firebase מחובר" value={isFirebaseConfigured ? 'כן' : 'לא — מצב demo'} ok={isFirebaseConfigured} />
        <Row label="מצב אחסון" value={isLocalMode ? 'localStorage בלבד' : 'Firestore'} ok={!isLocalMode} />
        <Row label="Anonymous Auth" value={firebaseUid ? firebaseUid.slice(0, 16) + '...' : 'לא פעיל'} ok={!!firebaseUid} />
      </div>

      {/* Auth */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h2 className="font-bold text-slate-700 mb-2">👤 משתמש נוכחי</h2>
        <Row label="מחובר" value={currentUser ? 'כן' : 'לא'} ok={!!currentUser} />
        {currentUser && (
          <>
            <Row label="שם" value={`${currentUser.firstName} ${currentUser.lastName}`} />
            <Row label="תפקיד" value={currentUser.role === 'parent' ? 'הורה' : 'ילד'} />
            <Row label="טלפון" value={currentUser.phone} />
          </>
        )}
      </div>

      {/* Data */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h2 className="font-bold text-slate-700 mb-2">📊 נתונים</h2>
        <Row label="מספר פעילויות" value={String(activitiesCount)} />
        <Row label="סה״כ הרשמות ילדים" value={String(registrationsCount)} />
        <Row
          label="פעילויות עם בעיית הסעה"
          value={activitiesMissing.length === 0 ? 'אין' : `${activitiesMissing.length} פעילויות`}
          ok={activitiesMissing.length === 0}
        />
        {activitiesMissing.map((a) => (
          <div key={a.id} className="text-xs text-red-600 mr-4 mt-1">• {a.title}</div>
        ))}
      </div>

      {/* Rules reminder */}
      {isFirebaseConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 mb-4">
          <p className="font-bold mb-1">⚠️ חשוב לפני שיתוף:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>ודא שהפסת rules של Firestore (firestore.rules)</li>
            <li>אין allow read, write: if true</li>
            <li>Anonymous Auth מופעל ב-Firebase Console</li>
            <li>.env.local לא ב-Git</li>
          </ul>
        </div>
      )}

      {isLocalMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800 mb-4">
          <p className="font-bold mb-1">📱 מצב Demo (localStorage)</p>
          <p className="text-xs">הנתונים נשמרים רק במכשיר זה. לשיתוף עם קבוצה — חבר Firebase.</p>
          <p className="text-xs mt-1">ראה .env.local.example להגדרה.</p>
        </div>
      )}

      <div className="text-xs text-center text-slate-400 mt-4">
        קייטנת הורים אריאל · {new Date().toLocaleDateString('he-IL')}
      </div>
    </div>
  );
}
