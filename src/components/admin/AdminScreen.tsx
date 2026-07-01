import { useState, useEffect, useCallback } from 'react';
import type { Parent, Child, Activity, ActivityEscort, ActivityRegistration } from '../../types';
import { getUsersByRole, adminDeleteUser, adminUpdateUser, deleteActivity, updateActivity } from '../../firebase/db';
import ActivityModal from '../activities/ActivityModal';

type Tab = 'activities' | 'parents' | 'children';

interface Props {
  activities: Activity[];
  allEscorts: ActivityEscort[];
  allRegistrations: ActivityRegistration[];
  onBack: () => void;
}

interface ConfirmState {
  label: string;
  onConfirm: () => Promise<void>;
}

export default function AdminScreen({ activities, allEscorts, allRegistrations, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('activities');
  const [parents, setParents] = useState<Parent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editUser, setEditUser] = useState<Parent | Child | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '' });

  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [opError, setOpError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const [ps, cs] = await Promise.all([
        getUsersByRole('parent'),
        getUsersByRole('child'),
      ]);
      setParents(ps as Parent[]);
      setChildren(cs as Child[]);
    } catch {
      setOpError('שגיאה בטעינת משתמשים');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const openEditUser = (user: Parent | Child) => {
    setEditUser(user);
    setEditForm({ firstName: user.firstName, lastName: user.lastName });
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    setOpError('');
    try {
      await adminUpdateUser(editUser.id, editForm);
      await loadUsers();
      setEditUser(null);
    } catch {
      setOpError('שגיאה בשמירה — בדוק הרשאות Firebase');
    } finally {
      setSaving(false);
    }
  };

  const askDeleteActivity = (a: Activity) => {
    setConfirm({
      label: `למחוק את הפעילות "${a.title}"?`,
      onConfirm: async () => {
        setSaving(true);
        setOpError('');
        try {
          await deleteActivity(a.id);
          setConfirm(null);
        } catch {
          setOpError('שגיאה במחיקה — בדוק הרשאות Firebase');
          setSaving(false);
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const askDeleteParent = (p: Parent) => {
    const childrenOf = children.filter((c) => c.createdByParentId === p.id);
    const extra = childrenOf.length > 0 ? ` וגם ${childrenOf.length} ילד/ים שלו/ה` : '';
    setConfirm({
      label: `למחוק את ${p.firstName} ${p.lastName}${extra}?`,
      onConfirm: async () => {
        setSaving(true);
        setOpError('');
        try {
          await Promise.all(childrenOf.map((c) => adminDeleteUser(c.id, c.phone)));
          await adminDeleteUser(p.id, p.phone);
          await loadUsers();
          setConfirm(null);
        } catch {
          setOpError('שגיאה במחיקה — בדוק הרשאות Firebase');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const askDeleteChild = (c: Child) => {
    setConfirm({
      label: `למחוק את ${c.firstName} ${c.lastName}?`,
      onConfirm: async () => {
        setSaving(true);
        setOpError('');
        try {
          await adminDeleteUser(c.id, c.phone);
          await loadUsers();
          setConfirm(null);
        } catch {
          setOpError('שגיאה במחיקה — בדוק הרשאות Firebase');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <span className="text-xl">🛡️</span>
        <h1 className="text-xl font-bold text-slate-800">פאנל ניהול</h1>
      </div>

      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
        {(['activities', 'parents', 'children'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'activities'
              ? `📅 פעילויות (${activities.length})`
              : t === 'parents'
              ? `👨‍👩‍👧 הורים (${parents.length})`
              : `🧒 ילדים (${children.length})`}
          </button>
        ))}
      </div>

      <div className="p-4 max-w-3xl mx-auto">

        {/* Activities */}
        {tab === 'activities' && (
          <div className="space-y-2">
            {activities.length === 0 && (
              <p className="text-slate-400 text-center py-12">אין פעילויות רשומות</p>
            )}
            {activities
              .slice()
              .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))
              .map((a) => {
                const date = new Date(a.startDateTime);
                const regs = allRegistrations.filter((r) => r.activityId === a.id);
                const escorts = allEscorts.filter((e) => e.activityId === a.id);
                return (
                  <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 truncate">{a.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {date.toLocaleDateString('he-IL')}{' '}
                          {date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                          {a.location ? ` · ${a.location}` : ''}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          יוצר: {a.createdByParentName} · {regs.length} ילדים · {escorts.length} מלווים
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditActivity(a)}
                          className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                        >
                          ✏️ ערוך
                        </button>
                        <button
                          onClick={() => askDeleteActivity(a)}
                          className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 transition-colors"
                        >
                          🗑️ מחק
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Parents */}
        {tab === 'parents' && (
          <div className="space-y-2">
            {loadingUsers && <p className="text-slate-400 text-center py-12">טוען...</p>}
            {!loadingUsers && parents.length === 0 && (
              <p className="text-slate-400 text-center py-12">אין הורים רשומים</p>
            )}
            {parents.map((p) => {
              const childrenOf = children.filter((c) => c.createdByParentId === p.id);
              return (
                <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800">{p.firstName} {p.lastName}</div>
                      <div className="text-xs text-slate-400 mt-0.5" dir="ltr">{p.phone}</div>
                      {childrenOf.length > 0 && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          ילדים: {childrenOf.map((c) => c.firstName).join(', ')}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditUser(p)}
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                      >
                        ✏️ ערוך
                      </button>
                      <button
                        onClick={() => askDeleteParent(p)}
                        className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 transition-colors"
                      >
                        🗑️ מחק
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Children */}
        {tab === 'children' && (
          <div className="space-y-2">
            {loadingUsers && <p className="text-slate-400 text-center py-12">טוען...</p>}
            {!loadingUsers && children.length === 0 && (
              <p className="text-slate-400 text-center py-12">אין ילדים רשומים</p>
            )}
            {children.map((c) => {
              const parentUser = parents.find((p) => p.id === c.createdByParentId);
              return (
                <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800">{c.firstName} {c.lastName}</div>
                      <div className="text-xs text-slate-400 mt-0.5" dir="ltr">{c.phone}</div>
                      {parentUser && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          הורה: {parentUser.firstName} {parentUser.lastName}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => openEditUser(c)}
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                      >
                        ✏️ ערוך
                      </button>
                      <button
                        onClick={() => askDeleteChild(c)}
                        className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-100 transition-colors"
                      >
                        🗑️ מחק
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              עריכת {editUser.role === 'parent' ? 'הורה' : 'ילד/ה'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="form-label">שם פרטי</label>
                <input
                  className="form-input"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">שם משפחה</label>
                <input
                  className="form-input"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">טלפון (לא ניתן לשינוי)</label>
                <input className="form-input bg-slate-50" value={editUser.phone} readOnly dir="ltr" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-slate-800 font-semibold mb-5">{confirm.label}</p>
            {opError && <p className="text-red-600 text-sm mb-3">{opError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                onClick={confirm.onConfirm}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'מוחק...' : 'מחק'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity edit modal */}
      {editActivity && (
        <ActivityModal
          onClose={() => setEditActivity(null)}
          editActivity={editActivity}
          initialEscortSeats={
            allEscorts.find((e) => e.activityId === editActivity.id && e.isCreator)?.seats ?? 4
          }
          onSave={async (data) => {
            await updateActivity(editActivity.id, data);
            setEditActivity(null);
          }}
        />
      )}
    </div>
  );
}
