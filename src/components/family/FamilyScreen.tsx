import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getChildrenByParent, getAllRegistrations } from '../../firebase/db';
import type { Child, ActivityRegistration } from '../../types';
import AddChildScreen from '../auth/AddChildScreen';

interface Props {
  onBack: () => void;
  onGoToCalendar: () => void;
}

export default function FamilyScreen({ onBack, onGoToCalendar }: Props) {
  const { currentUser, isParent, logout } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [childRegs, setChildRegs] = useState<ActivityRegistration[]>([] as ActivityRegistration[]);
  const [showAddChild, setShowAddChild] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'parent') {
      getChildrenByParent(currentUser.id).then(setChildren);
      getAllRegistrations().then(setChildRegs);
    }
  }, [currentUser]);

  const loadChildren = () => {
    if (currentUser?.role === 'parent') {
      getChildrenByParent(currentUser.id).then(setChildren);
    }
  };

  if (showAddChild) {
    return (
      <AddChildScreen
        onBack={() => { setShowAddChild(false); loadChildren(); }}
        onGoToCalendar={onGoToCalendar}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <h1 className="text-xl font-bold text-slate-800">המשפחה שלי</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Current user info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
              {currentUser?.role === 'parent' ? '👨‍👩‍👧' : '🧒'}
            </div>
            <div>
              <div className="font-bold text-slate-800">
                {currentUser?.firstName} {currentUser?.lastName}
              </div>
              <div className="text-sm text-slate-500">
                {currentUser?.role === 'parent' ? 'הורה' : 'ילד/ה'}
              </div>
              <div className="text-xs text-slate-400" dir="ltr">{currentUser?.phone}</div>
            </div>
          </div>
        </div>

        {/* Children list — parents only */}
        {isParent && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800">ילדי המשפחה</h2>
              <button
                onClick={() => setShowAddChild(true)}
                className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                + הוסף ילד/ה
              </button>
            </div>

            {children.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">👦</div>
                <p className="text-slate-400 text-sm">לא הוספת ילדים עדיין</p>
                <button
                  onClick={() => setShowAddChild(true)}
                  className="mt-3 text-emerald-600 hover:underline text-sm font-medium"
                >
                  הוסף את הילד/ה הראשון/ה
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {children.map((child) => {
                  const regs = childRegs.filter((r) => r.childId === child.id);
                  return (
                    <div key={child.id} className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                      <div>
                        <div className="font-semibold text-slate-800">{child.firstName} {child.lastName}</div>
                        <div className="text-xs text-slate-400" dir="ltr">{child.phone}</div>
                      </div>
                      <div className="text-sm text-slate-500">
                        {regs.length} פעילויות
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Help text */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
          <p className="font-semibold mb-1">💡 איך הקייטנה עובדת?</p>
          <ul className="space-y-1 text-xs list-disc list-inside">
            <li>הורים יוצרים פעילויות בלוח</li>
            <li>ילדים נרשמים לפעילויות שמעניינות אותם</li>
            <li>כשחסרים מקומות ברכב — הפעילות מופיעה באדום</li>
            <li>הורים יכולים להצטרף כמלווים ולהוסיף מקומות ברכב</li>
            <li>שלחו תזכורות דרך מסך "תזכורות"</li>
          </ul>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full py-3 rounded-xl border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-colors text-sm"
        >
          התנתק/י
        </button>
      </div>
    </div>
  );
}
