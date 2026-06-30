import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '../common/Modal';
import type { Activity } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
  /** Called with activity data AND seats for the creator-escort */
  onSave: (data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>, seats: number) => Promise<void>;
  initialDate?: Date;
  editActivity?: Activity;
  initialEscortSeats?: number;
  onEscortSeatsChange?: (seats: number) => void;
}

export default function ActivityModal({
  onClose, onSave, initialDate, editActivity, initialEscortSeats = 4, onEscortSeatsChange,
}: Props) {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    title: '',
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : '2026-07-01',
    startTime: '10:00',
    endTime: '13:00',
    location: '',
    description: '',
    seats: String(initialEscortSeats),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editActivity) {
      const start = new Date(editActivity.startDateTime);
      const end = new Date(editActivity.endDateTime);
      setForm({
        title: editActivity.title,
        date: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
        location: editActivity.location,
        description: editActivity.description,
        seats: String(initialEscortSeats),
      });
    }
  }, [editActivity, initialEscortSeats]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Guards — should never pass due to UI hiding the button, but added for safety
    if (!currentUser || currentUser.role !== 'parent') {
      setError('רק הורה יכול ליצור פעילות');
      return;
    }

    // Validation
    if (!form.title.trim()) { setError('חובה להזין שם פעילות'); return; }
    if (!form.location.trim()) { setError('חובה להזין מיקום'); return; }

    const startDateTime = new Date(`${form.date}T${form.startTime}:00`).toISOString();
    const endDateTime = new Date(`${form.date}T${form.endTime}:00`).toISOString();

    if (endDateTime <= startDateTime) {
      setError('שעת הסיום חייבת להיות אחרי שעת ההתחלה');
      return;
    }

    const seats = parseInt(form.seats);
    if (isNaN(seats) || seats < 0 || !Number.isInteger(seats)) {
      setError('מספר מקומות חייב להיות מספר שלם אפס ומעלה');
      return;
    }

    setLoading(true);
    try {
      const activityData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'> = {
        title: form.title.trim(),
        startDateTime,
        endDateTime,
        location: form.location.trim(),
        description: form.description.trim(),
        createdByParentId: currentUser.id,
        createdByParentName: `${currentUser.firstName} ${currentUser.lastName}`,
        type: 'activity',
        eveningReminderMarkedSent: false,
        halfHourReminderMarkedSent: false,
      };
      await onSave(activityData, seats);
      if (onEscortSeatsChange) onEscortSeatsChange(seats);
    } catch {
      setError('שגיאה בשמירה — נסה שוב');
    }
    setLoading(false);
  };

  return (
    <Modal onClose={onClose} title={editActivity ? 'עריכת פעילות' : 'פעילות חדשה'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">שם הפעילות *</label>
          <input
            className="form-input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
            placeholder="למשל: טיול לנחל עמוד"
            maxLength={100}
          />
        </div>

        <div>
          <label className="form-label">תאריך *</label>
          <input
            type="date"
            className="form-input"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
            required
            min="2026-07-01"
            max="2026-08-31"
            dir="ltr"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">שעת התחלה *</label>
            <input type="time" className="form-input" value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)} required dir="ltr" />
          </div>
          <div>
            <label className="form-label">שעת סיום *</label>
            <input type="time" className="form-input" value={form.endTime}
              onChange={(e) => set('endTime', e.target.value)} required dir="ltr" />
          </div>
        </div>

        <div>
          <label className="form-label">מיקום *</label>
          <input
            className="form-input"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            required
            placeholder="למשל: חוף כנרת, פארק הירקון"
          />
        </div>

        <div>
          <label className="form-label">מקומות פנויים ברכב שלך *</label>
          <input
            type="number"
            className="form-input"
            value={form.seats}
            onChange={(e) => set('seats', e.target.value)}
            required
            min="0"
            max="20"
            step="1"
            dir="ltr"
          />
          <p className="text-xs text-slate-400 mt-1">מקומות לילדים בלבד, לא כולל הנהג</p>
        </div>

        <div>
          <label className="form-label">פרטים נוספים</label>
          <textarea
            className="form-input"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="תיאור, מה להביא, הוראות הגעה..."
          />
        </div>

        <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
          <span className="font-semibold">הורה יוזם: </span>
          {currentUser?.firstName} {currentUser?.lastName}
          <br />
          <span className="text-xs text-blue-500">תהיה אוטומטית הורה מלווה ראשון בפעילות זו</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? 'שומר...' : editActivity ? 'שמור שינויים' : 'צור פעילות'}
          </button>
          <button type="button" onClick={onClose}
            className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors">
            ביטול
          </button>
        </div>
      </form>
    </Modal>
  );
}
