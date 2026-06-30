import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onGoRegister: () => void;
}

export default function LoginScreen({ onGoRegister }: LoginScreenProps) {
  const { loginAsParent, loginAsChild } = useAuth();
  const [role, setRole] = useState<'parent' | 'child' | null>(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !phone || !code) return;
    setError('');
    setLoading(true);
    const result = role === 'parent'
      ? await loginAsParent(phone, code)
      : await loginAsChild(phone, code);
    setLoading(false);
    if (!result.ok) setError(result.error ?? 'שגיאה');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏕️</div>
          <h1 className="text-2xl font-bold text-slate-800">קייטנת הורים אריאל</h1>
          <p className="text-slate-500 text-sm mt-1">חופש קיץ תשפ״ו — יולי–אוגוסט 2026</p>
        </div>

        {!role ? (
          <div className="space-y-4">
            <p className="text-center text-slate-600 font-medium mb-6">מי אתה?</p>
            <button
              onClick={() => setRole('parent')}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3"
            >
              <span className="text-2xl">👨‍👩‍👧</span>
              אני הורה
            </button>
            <button
              onClick={() => setRole('child')}
              className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-3"
            >
              <span className="text-2xl">🧒</span>
              אני ילד/ה
            </button>
            <div className="text-center pt-4">
              <button
                onClick={onGoRegister}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                הורה חדש? הירשם כאן
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => { setRole(null); setError(''); }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ←
              </button>
              <span className="text-slate-600 font-medium">
                {role === 'parent' ? '👨‍👩‍👧 כניסה כהורה' : '🧒 כניסה כילד/ה'}
              </span>
            </div>

            <div>
              <label className="form-label">מספר סלולרי</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="form-input"
                placeholder="050-0000000"
                required
                dir="ltr"
              />
            </div>

            <div>
              <label className="form-label">קוד כניסה</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="form-input"
                placeholder="הקוד שקיבלת"
                required
                dir="ltr"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'מתחבר...' : 'כניסה'}
            </button>

            {role === 'parent' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={onGoRegister}
                  className="text-blue-600 hover:underline text-sm"
                >
                  הורה חדש? הירשם כאן
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
