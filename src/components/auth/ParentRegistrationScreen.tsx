import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onBack: () => void;
}

export default function ParentRegistrationScreen({ onBack }: Props) {
  const { registerParent } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    accessCode: '',
    accessCode2: '',
    parentCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.accessCode !== form.accessCode2) {
      setError('הקודים אינם תואמים');
      return;
    }
    if (form.accessCode.length < 4) {
      setError('קוד כניסה חייב להיות לפחות 4 תווים');
      return;
    }

    setLoading(true);
    const result = await registerParent({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      accessCode: form.accessCode,
      parentCode: form.parentCode,
    });
    setLoading(false);

    if (!result.ok) setError(result.error ?? 'שגיאה ברישום');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">רישום הורה חדש</h1>
            <p className="text-slate-500 text-xs">קייטנת הורים אריאל</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">שם פרטי</label>
              <input className="form-input" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required placeholder="ישראל" />
            </div>
            <div>
              <label className="form-label">שם משפחה</label>
              <input className="form-input" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required placeholder="ישראלי" />
            </div>
          </div>

          <div>
            <label className="form-label">מספר סלולרי</label>
            <input
              type="tel"
              className="form-input"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              placeholder="050-0000000"
              dir="ltr"
            />
          </div>

          <div>
            <label className="form-label">קוד כניסה אישי (לבחירתך)</label>
            <input
              type="text"
              className="form-input"
              value={form.accessCode}
              onChange={(e) => set('accessCode', e.target.value)}
              required
              placeholder="לפחות 4 תווים"
              dir="ltr"
            />
            <p className="text-xs text-slate-400 mt-1">זה הקוד שתכניס/י בכל כניסה</p>
          </div>

          <div>
            <label className="form-label">אמת קוד כניסה</label>
            <input
              type="text"
              className="form-input"
              value={form.accessCode2}
              onChange={(e) => set('accessCode2', e.target.value)}
              required
              placeholder="הקלד שוב את הקוד"
              dir="ltr"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <label className="form-label text-amber-800">קוד הורים</label>
            <input
              type="text"
              className="form-input border-amber-300"
              value={form.parentCode}
              onChange={(e) => set('parentCode', e.target.value)}
              required
              placeholder="קוד שקיבלת מהמארגנים"
              dir="ltr"
            />
            <p className="text-xs text-amber-700 mt-1">
              קוד זה ניתן רק להורים — פנה למארגנים לקבלו
            </p>
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
            {loading ? 'רושם...' : 'הירשם'}
          </button>
        </form>
      </div>
    </div>
  );
}
