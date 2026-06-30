import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '../common/Modal';
import type { Activity } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onClose: () => void;
  onSave: (data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  initialDate?: Date;
  editActivity?: Activity;
  initialEscortSeats?: number;
  onEscortSeatsChange?: (seats: number) => void;
}

export default function ActivityModal({ onClose, onSave, initialDate, editActivity, initialEscortSeats = 0, onEscortSeatsChange }: Props) {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    title: '',
    date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date('2026-07-01'), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '13:00',
    location: '',
    description: '',
    seats: initialEscortSeats > 0 ? String(initialEscortSeats) : '4',
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
        seats: String(initialEscortSeats || 4),
      });
    }
  }, [editActivity, initialEscortSeats]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser || currentUser.role !== 'parent') {
      setError('רק הורה יכול ליצור פעילות');
      return;
    }

    const startDateTime = new Date(`${form.date}T${form.startTime}:00`).toISOString();
    const endDateTime = new Date(`${form.date}T${form.endTime}:00`).toISOString();

    if (endDateTime <= startDateTime) {
      setError('שעת הסיום חייבת להיות אחרי שעת ההתחלה');
      return;
    }

    setLoading(true);
    try {
      await onSave({
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
      });
      if (onEscortSeatsChange) onEscortSeatsChange(parseInt(form.seats) || 0);
      onClose();
    } catch {
      setError('שגיאה בשמירה');
    }
    setLoading(false);
  };

  const title = editActivity ? 'עריכת פעילות' : 'פעילות חדשה';

  return (
    <Modal onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">שם הפעילות / כותרת *</label>
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
            <input
              type="time"
              className="form-input"
              value={form.startTime}
              onChange={(e) => set('startTime', e.target.value)}
              required
              dir="ltr"
            />
          </div>
          <div>
            <label className="form-label">שעת סיום *</label>
            <input
              type="time"
              className="form-input"
              value={form.endTime}
              onChange={(e) => set('endTime', e.target.value)}
              required
              dir="ltr"
            />
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
          <label className="form-label">מספר מקומות פנויים ברכב שלך *</label>
          <input
            type="number"
            className="form-input"
            value={form.seats}
            onChange={(e) => set('seats', e.target.value)}
            required
            min="0"
            max="20"
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
          <span className="text-xs text-blue-500">אתה תהיה אוטומטית הורה מלווה בפעילות זו</span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'שומר...' : editActivity ? 'שמור שינויים' : 'צור פעילות'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
          >
            ביטול
          </button>
        </div>
      </form>
    </Modal>
  );
}
