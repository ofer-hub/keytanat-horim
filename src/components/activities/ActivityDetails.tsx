import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import Modal from '../common/Modal';
import EscortJoinModal from './EscortJoinModal';
import type { Activity, ActivityEscort, ActivityRegistration } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useEscorts } from '../../hooks/useEscorts';
import { useRegistrations } from '../../hooks/useRegistrations';
import { calculateActivityCoverage } from '../../utils/coverage';
import { downloadICS } from '../../utils/icsGenerator';
import { buildWhatsAppMessage } from '../../utils/whatsapp';
import { toHebrewDateFull } from '../../utils/hebrewDate';

interface Props {
  activity: Activity;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// ─── Coverage Alert ────────────────────────────────────────────────────────────
function CoverageAlert({ childCount, seatCount, missingSeats, needsAdditionalEscort }: {
  childCount: number; seatCount: number; missingSeats: number; needsAdditionalEscort: boolean;
}) {
  if (needsAdditionalEscort) {
    return (
      <div className="alert-missing">
        <div className="text-lg font-black">🚨 חסר הורה מלווה נוסף!</div>
        <div className="text-sm font-normal mt-1">
          {childCount} ילדים רשומים · {seatCount} מקומות ברכבים
        </div>
        <div className="text-base font-bold mt-1">חסרים {missingSeats} מקומות</div>
      </div>
    );
  }
  if (childCount === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 text-sm">
        אין ילדים רשומים עדיין
      </div>
    );
  }
  return (
    <div className="alert-covered">
      <div className="text-base font-bold">✅ הסעה מכוסה</div>
      <div className="text-sm font-normal mt-1">
        {childCount} ילדים · {seatCount} מקומות זמינים
      </div>
    </div>
  );
}

// ─── WhatsApp Panel ────────────────────────────────────────────────────────────
function WhatsAppPanel({ activity, escorts, registrations }: {
  activity: Activity; escorts: ActivityEscort[]; registrations: ActivityRegistration[];
}) {
  const [show, setShow] = useState(false);
  const [type, setType] = useState<'evening' | 'halfhour'>('evening');
  const [copied, setCopied] = useState(false);

  const msg = buildWhatsAppMessage(activity, escorts, registrations, type);

  const copy = async () => {
    await navigator.clipboard.writeText(msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!show) {
    return (
      <button onClick={() => setShow(true)}
        className="w-full py-2 rounded-xl border-2 border-green-500 text-green-700 font-semibold hover:bg-green-50 transition-colors text-sm">
        📱 הכן הודעת וואטסאפ
      </button>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        {(['evening', 'halfhour'] as const).map((t) => (
          <button key={t} onClick={() => setType(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${type === t ? 'bg-green-600 text-white' : 'bg-white text-green-700 border border-green-300'}`}>
            {t === 'evening' ? 'ערב לפני' : 'חצי שעה לפני'}
          </button>
        ))}
      </div>
      <textarea readOnly value={msg} className="w-full text-sm bg-white border border-green-200 rounded-lg p-3 resize-none" rows={8} dir="rtl" />
      <div className="flex gap-2">
        <button onClick={copy}
          className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700">
          {copied ? '✓ הועתק!' : '📋 העתק'}
        </button>
        <button
          onClick={() => navigator.share ? navigator.share({ text: msg }) : copy()}
          className="flex-1 py-2 rounded-lg bg-white border border-green-400 text-green-700 text-sm font-semibold">
          📤 שתף
        </button>
      </div>
      <p className="text-xs text-green-600 text-center">שלח ידנית בקבוצת הוואטסאפ</p>
      <button onClick={() => setShow(false)} className="text-xs text-gray-400 w-full text-center">סגור</button>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ActivityDetails({ activity, onClose, onEdit, onDelete }: Props) {
  const { currentUser, isParent, isChild } = useAuth();
  const { escorts, loading: escortsLoading, joinEscort, leaveEscort } = useEscorts(activity.id);
  const { registrations, loading: regsLoading, register, unregister } = useRegistrations(activity.id);

  const [showEscortModal, setShowEscortModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loading = escortsLoading || regsLoading;
  const coverage = calculateActivityCoverage(activity, escorts, registrations);

  const isCreator = isParent && currentUser?.id === activity.createdByParentId;
  const myEscort = isParent ? escorts.find((e) => e.parentId === currentUser?.id) : undefined;
  const myReg = isChild ? registrations.find((r) => r.childId === currentUser?.id) : undefined;

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleRegister = useCallback(async () => {
    if (!currentUser || !isChild) return;
    setActionLoading(true);
    try {
      if (myReg) {
        await unregister(myReg.id);
        showMsg('הוסרת מהפעילות');
      } else {
        await register({
          activityId: activity.id,
          childId: currentUser.id,
          childName: `${currentUser.firstName} ${currentUser.lastName}`,
          familyId: currentUser.familyId,
          registeredByUserId: currentUser.id,
        });
        showMsg('נרשמת לפעילות! ✓');
      }
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : 'שגיאה', 'error');
    }
    setActionLoading(false);
  }, [currentUser, isChild, myReg, register, unregister, activity.id]);

  const handleJoinEscort = useCallback(async (seats: number) => {
    if (!currentUser || !isParent) throw new Error('רק הורה יכול להצטרף');
    await joinEscort({
      activityId: activity.id,
      parentId: currentUser.id,
      parentName: `${currentUser.firstName} ${currentUser.lastName}`,
      phone: currentUser.phone,
      seats,
      isCreator: false,
    });
    showMsg('הצטרפת כהורה מלווה! ✓');
  }, [currentUser, isParent, joinEscort, activity.id]);

  const handleLeaveEscort = useCallback(async () => {
    if (!myEscort) return;
    setActionLoading(true);
    try {
      await leaveEscort(myEscort.id, myEscort.isCreator);
      showMsg('הוסרת מרשימת המלווים');
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : 'שגיאה', 'error');
    }
    setActionLoading(false);
  }, [myEscort, leaveEscort]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    if (onDelete) { onDelete(); onClose(); }
  }, [confirmDelete, onDelete, onClose]);

  const startDate = new Date(activity.startDateTime);
  const endDate = new Date(activity.endDateTime);
  const dateStr = format(startDate, 'EEEE, d בMMMM yyyy', { locale: he });
  const hebrewDate = toHebrewDateFull(startDate);
  const startTime = format(startDate, 'HH:mm');
  const endTime = format(endDate, 'HH:mm');

  return (
    <>
      <Modal onClose={onClose} title={activity.title} maxWidth="620px">
        <div className="space-y-4">
          {/* Real-time loading indicator */}
          {loading && (
            <div className="text-xs text-slate-400 text-center">טוען נתונים...</div>
          )}

          <CoverageAlert {...coverage} />

          {/* Date + time */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xl font-black text-slate-800 mb-1">{hebrewDate}</div>
            <div className="text-sm text-slate-500">{dateStr}</div>
            <div className="text-base font-semibold text-slate-700 mt-2">🕐 {startTime} – {endTime}</div>
          </div>

          {/* Location + description */}
          <div className="space-y-2">
            {activity.location && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-lg">📍</span>
                <span className="text-slate-600">{activity.location}</span>
              </div>
            )}
            {activity.description && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-lg">📝</span>
                <span className="text-slate-600 whitespace-pre-wrap">{activity.description}</span>
              </div>
            )}
          </div>

          {/* Escorts */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-bold text-slate-700 mb-2">👨‍👩‍👧 הורים מלווים</h3>
            {escorts.length === 0 ? (
              <p className="text-sm text-slate-400">אין עדיין</p>
            ) : (
              <div className="space-y-2">
                {escorts.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{e.parentName}</span>
                      {e.isCreator && <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">יוזם</span>}
                    </div>
                    <span className="text-slate-500">{e.seats} מקומות</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-blue-200 text-sm text-slate-600">
              סה״כ: <span className="font-bold">{coverage.seatCount} מקומות</span>
            </div>
          </div>

          {/* Children */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <h3 className="font-bold text-slate-700 mb-2">👦 ילדים רשומים ({registrations.length})</h3>
            {registrations.length === 0 ? (
              <p className="text-sm text-slate-400">אין עדיין</p>
            ) : (
              <div className="space-y-1">
                {registrations.map((r) => (
                  <div key={r.id} className="text-sm text-slate-700 flex items-center gap-2">
                    <span className="text-emerald-500">•</span>
                    {r.childName}
                    {r.childId === currentUser?.id && <span className="text-xs text-emerald-600 font-bold">(אני)</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback message */}
          {msg && (
            <div className={`rounded-lg p-3 text-sm font-medium text-center ${
              msgType === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              {msg}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="space-y-2 pt-2 border-t border-gray-100">

            {/* Child: register/unregister */}
            {isChild && (
              <button onClick={handleRegister} disabled={actionLoading}
                className={`w-full py-3 rounded-xl font-bold text-white transition-colors disabled:opacity-50 ${
                  myReg ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>
                {actionLoading ? '...' : myReg ? '❌ בטל הרשמה שלי' : '✅ הירשם לפעילות'}
              </button>
            )}

            {/* Parent: join as escort */}
            {isParent && !myEscort && (
              <button onClick={() => setShowEscortModal(true)}
                className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${
                  coverage.needsAdditionalEscort
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}>
                🚗 {coverage.needsAdditionalEscort ? 'הצטרף/י כהורה מלווה (דרוש!)' : 'הצטרף/י כהורה מלווה'}
              </button>
            )}

            {/* Parent: leave escort (not creator) */}
            {isParent && myEscort && !myEscort.isCreator && (
              <button onClick={handleLeaveEscort} disabled={actionLoading}
                className="w-full py-2 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 text-sm disabled:opacity-50">
                הסר אותי מהמלווים
              </button>
            )}

            {/* ICS */}
            {(myReg || myEscort) && (
              <button onClick={() => downloadICS(activity)}
                className="w-full py-2 rounded-xl border-2 border-indigo-400 text-indigo-700 font-semibold hover:bg-indigo-50 transition-colors text-sm">
                📅 הוסף ליומן שלי (עם תזכורות)
              </button>
            )}

            {/* WhatsApp — parents only */}
            {isParent && (
              <WhatsAppPanel activity={activity} escorts={escorts} registrations={registrations} />
            )}

            {/* Edit / Delete — creator only */}
            {isCreator && (
              <div className="flex gap-2 pt-2">
                <button onClick={onEdit}
                  className="flex-1 py-2 rounded-xl bg-amber-100 text-amber-800 font-semibold hover:bg-amber-200 text-sm">
                  ✏️ ערוך
                </button>
                <button onClick={handleDelete}
                  className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-colors ${
                    confirmDelete ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}>
                  {confirmDelete ? '⚠️ לחץ שוב למחיקה' : '🗑️ מחק'}
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">
            💡 לתזכורת אמינה — הוסף ליומן האישי
          </p>
        </div>
      </Modal>

      {showEscortModal && (
        <EscortJoinModal
          activityId={activity.id}
          activityTitle={activity.title}
          onClose={() => setShowEscortModal(false)}
          onJoin={handleJoinEscort}
        />
      )}
    </>
  );
}
