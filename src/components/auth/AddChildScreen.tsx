import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getChildrenByParent } from '../../firebase/db';
import type { Child } from '../../types';

interface Props {
  onBack: () => void;
  onGoToCalendar: () => void;
}

export default function AddChildScreen({ onBack, onGoToCalendar }: Props) {
  const { currentUser, addChild } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [form, setForm] = useState({ firstName: '', phone: '', accessCode: '', accessCode2: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'parent') {
      getChildrenByParent(currentUser.id).then(setChildren);
    }
  }, [currentUser]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.accessCode !== form.accessCode2) {
      setError('הקודים אינם תואמים');
      return;
    }
    if (form.accessCode.length < 3) {
      setError('קוד כניסה חייב להיות לפחות 3 תווים');
      return;
    }

    setLoading(true);
    const result = await addChild({
      firstName: form.firstName,
      lastName: currentUser?.lastName ?? '',
      phone: form.phone,
      accessCode: form.accessCode,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? 'שגיאה');
    } else {
      setSuccess(`${form.firstName} נרשם/ה בהצלחה!`);
      setForm({ firstName: '', phone: '', accessCode: '', accessCode2: '' });
      if (currentUser?.role === 'parent') {
        getChildrenByParent(currentUser.id).then(setChildren);
      }
    }
  };

  if (!currentUser || currentUser.role !== 'parent') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
          <div>
            <h1 className="text-2xl font-black text-slate-800">מסך רישום ילד/ה</h1>
            <p className="text-slate-500 text-xs">משפחת {currentUser.lastName}</p>
          </div>
        </div>

        {children.length > 0 && (
          <div className="mb-6 bg-slate-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-slate-600 mb-2">ילדים רשומים:</p>
            <div className="space-y-1">
              {children.map((c) => (
                <div key={c.id} className="text-sm text-slate-700 flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  {c.firstName} {c.lastName}
                  <span className="text-slate-400 text-xs" dir="ltr">({c.phone})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">שם פרטי של הילד/ה</label>
            <input
              className="form-input"
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              required
              placeholder="שם פרטי"
            />
          </div>

          <div>
            <label className="form-label">שם משפחה</label>
            <input
              className="form-input bg-slate-50"
              value={currentUser.lastName}
              readOnly
              dir="rtl"
            />
          </div>

          <div>
            <label className="form-label">מספר סלולרי של הילד/ה</label>
            <input
              type="tel"
              className="form-input"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/[^\d-]/g, ''))}
              required
              placeholder="050-0000000"
              dir="ltr"
            />
          </div>

          <div>
            <label className="form-label">קוד כניסה לילד/ה</label>
            <input
              type="text"
              className="form-input"
              value={form.accessCode}
              onChange={(e) => set('accessCode', e.target.value)}
              required
              placeholder="לפחות 3 תווים"
              dir="ltr"
            />
            <p className="text-xs text-slate-400 mt-1">הילד/ה יכנס/תכנס עם קוד זה — שמור/י אותו</p>
          </div>

          <div>
            <label className="form-label">אמת קוד כניסה</label>
            <input
              type="text"
              className="form-input"
              value={form.accessCode2}
              onChange={(e) => set('accessCode2', e.target.value)}
              required
              placeholder="הקלד שוב"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm font-medium">
              {error}
            </div>
          )}
          {success && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg p-3 text-sm font-medium">
                ✓ {success}
              </div>
              <button
                type="button"
                onClick={onGoToCalendar}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
              >
                📅 חזרה ללוח הפעילויות
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'מוסיף...' : success ? '+ הוסף ילד/ה נוסף/ת' : 'הוסף ילד/ה'}
          </button>
        </form>
      </div>
    </div>
  );
}
