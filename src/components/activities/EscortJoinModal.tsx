import React, { useState } from 'react';
import Modal from '../common/Modal';
import { useAuth } from '../../context/AuthContext';

interface Props {
  activityId: string;
  activityTitle: string;
  onClose: () => void;
  onJoin: (seats: number) => Promise<void>;
}

export default function EscortJoinModal({ activityTitle, onClose, onJoin }: Props) {
  const { currentUser } = useAuth();
  const [seats, setSeats] = useState('3');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(seats);
    if (isNaN(n) || n < 0) {
      setError('נא להזין מספר תקין');
      return;
    }
    setLoading(true);
    try {
      await onJoin(n);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה');
    }
    setLoading(false);
  };

  return (
    <Modal onClose={onClose} title="הצטרפות כהורה מלווה">
      <div className="space-y-4">
        <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
          <div className="font-semibold">{activityTitle}</div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <span className="text-sm font-medium text-slate-600">הורה מלווה: </span>
          <span className="text-sm font-bold text-slate-800">
            {currentUser?.firstName} {currentUser?.lastName}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">מספר מקומות פנויים ברכב שלך</label>
            <input
              type="number"
              className="form-input"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              min="0"
              max="20"
              required
              dir="ltr"
            />
            <p className="text-xs text-slate-400 mt-1">מקומות לילדים בלבד, לא כולל הנהג</p>
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
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'מצטרף...' : 'אני מצטרף/ת כמלווה'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
