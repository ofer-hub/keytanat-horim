import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

type Phase = 'phone' | 'code' | 'register';

interface Props {
  onBack?: () => void;
}

export default function AuthFlow({ onBack }: Props) {
  const { checkPhone, login, registerParent } = useAuth();

  const [phase, setPhase] = useState<Phase>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', accessCode: '', accessCode2: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const resetError = () => setError('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();
    setLoading(true);
    try {
      const result = await checkPhone(phone);
      setPhase(result.exists ? 'code' : 'register');
    } catch {
      setError('שגיאת חיבור — בדוק אינטרנט ונסה שוב');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();
    setLoading(true);
    try {
      const result = await login(phone, code);
      if (!result.ok) setError(result.error ?? 'שגיאה');
    } catch {
      setError('שגיאת חיבור — בדוק אינטרנט ונסה שוב');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetError();
    if (form.accessCode !== form.accessCode2) { setError('הקודים אינם תואמים'); return; }
    if (form.accessCode.length < 4) { setError('קוד כניסה חייב להיות לפחות 4 תווים'); return; }
    setLoading(true);
    try {
      const result = await registerParent({
        firstName: form.firstName,
        lastName: form.lastName,
        phone,
        accessCode: form.accessCode,
      });
      if (!result.ok) setError(result.error ?? 'שגיאה ברישום');
    } catch {
      setError('שגיאת חיבור — בדוק אינטרנט ונסה שוב');
    } finally {
      setLoading(false);
    }
  };

  const goToPhone = () => { resetError(); setPhase('phone'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏕️</div>
          <h1 className="text-2xl font-bold text-slate-800">קייטנת הורים אריאל</h1>
          <p className="text-slate-500 text-sm mt-1">חופש קיץ תשפ״ו — יולי–אוגוסט 2026</p>
        </div>

        {/* Phase: phone */}
        {phase === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            {onBack && (
              <button type="button" onClick={onBack} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-2">
                ← חזרה ללוח
              </button>
            )}
            <div>
              <label className="form-label">מספר סלולרי</label>
              <input
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d-]/g, ''))}
                placeholder="050-0000000"
                required
                autoFocus
                dir="ltr"
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'בודק...' : 'המשך'}
            </button>
          </form>
        )}

        {/* Phase: code (existing user) */}
        {phase === 'code' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <BackLink onClick={goToPhone} label="שנה מספר" />
            <div className="bg-slate-50 rounded-lg px-4 py-2.5 text-slate-700 font-medium text-sm" dir="ltr">{phone}</div>
            <div>
              <label className="form-label">קוד כניסה</label>
              <input
                type="text"
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="הקוד שבחרת בהרשמה"
                required
                autoFocus
                dir="ltr"
              />
            </div>
            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>
          </form>
        )}

        {/* Phase: register (new user) */}
        {phase === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <BackLink onClick={goToPhone} label="שנה מספר" />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              מספר זה אינו רשום. <strong>ילד/ה?</strong> בקשו מהורה להוסיף אותכם.
            </div>

            <p className="font-bold text-slate-700">הרשמה כהורה חדש</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">שם פרטי</label>
                <input className="form-input" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} required placeholder="ישראל" />
              </div>
              <div>
                <label className="form-label">שם משפחה</label>
                <input className="form-input" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} required placeholder="ישראלי" />
              </div>
            </div>

            <div>
              <label className="form-label">בחר קוד כניסה אישי</label>
              <input type="text" className="form-input" value={form.accessCode} onChange={(e) => setField('accessCode', e.target.value)} required placeholder="לפחות 4 תווים" dir="ltr" />
              <p className="text-xs text-slate-400 mt-1">זה הקוד שתכניס/י בכל כניסה עתידית</p>
            </div>

            <div>
              <label className="form-label">אמת קוד כניסה</label>
              <input type="text" className="form-input" value={form.accessCode2} onChange={(e) => setField('accessCode2', e.target.value)} required placeholder="הקלד שוב" dir="ltr" />
            </div>

            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {loading ? 'רושם...' : 'הירשם'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm">
      ← {label}
    </button>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm font-medium">{msg}</div>
  );
}
