import { useState, useCallback, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthFlow from './components/auth/AuthFlow';
import CalendarView, { type CalendarViewHandle } from './components/calendar/CalendarView';
import ActivityModal from './components/activities/ActivityModal';
import ActivityDetails from './components/activities/ActivityDetails';
import RemindersScreen from './components/reminders/RemindersScreen';
import FamilyScreen from './components/family/FamilyScreen';
import StatusScreen from './components/debug/StatusScreen';
import AdminScreen from './components/admin/AdminScreen';
import { useRealtimeData } from './hooks/useRealtimeData';
import { useActivityActions } from './hooks/useActivities';
import type { Activity } from './types';
import { addEscort } from './firebase/db';

type Screen = 'calendar' | 'reminders' | 'family' | 'status' | 'admin';

function NavBar({
  screen,
  setScreen,
  isGuest,
  onLoginClick,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  isGuest: boolean;
  onLoginClick: () => void;
}) {
  const { currentUser, isParent, isAdmin } = useAuth();

  return (
    <nav className="nav-bar shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">🏕️</span>
        <span className="font-bold text-slate-800 text-sm hidden sm:block">קייטנת הורים אריאל</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setScreen('calendar')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${screen === 'calendar' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          📅 לוח
        </button>

        {!isGuest && isParent && (
          <button
            onClick={() => setScreen('reminders')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${screen === 'reminders' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            📨 תזכורות
          </button>
        )}

        {!isGuest && isAdmin && (
          <button
            onClick={() => setScreen('admin')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${screen === 'admin' ? 'bg-purple-100 text-purple-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            🛡️ ניהול
          </button>
        )}

        {isGuest ? (
          <button
            onClick={onLoginClick}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
          >
            כניסה / הרשמה
          </button>
        ) : (
          <>
            <button
              onClick={() => setScreen('family')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${screen === 'family' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              👤 {currentUser?.firstName ?? 'פרופיל'}
            </button>
            <button
              onClick={() => setScreen('status')}
              className={`px-2 py-2 rounded-lg text-xs transition-colors ${screen === 'status' ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}
              title="בדיקת מוכנות"
            >
              ⚙️
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function AppInner() {
  const { currentUser, loading, isParent, isAdmin } = useAuth();
  const isGuest = !currentUser;

  const calendarRef = useRef<CalendarViewHandle>(null);
  const [dayViewDate, setDayViewDate] = useState<Date | null>(null);

  const [showAuth, setShowAuth] = useState(false);
  const [screen, setScreen] = useState<Screen>('calendar');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pendingSeats, setPendingSeats] = useState(4);

  const { activities, allEscorts, allRegistrations, loading: dataLoading } = useRealtimeData(isGuest);
  const { createActivity, updateActivity, deleteActivity } = useActivityActions();

  // Close auth after successful login
  useEffect(() => {
    if (currentUser) setShowAuth(false);
  }, [currentUser]);

  // Redirect guests away from protected screens
  useEffect(() => {
    if (isGuest && screen !== 'calendar') setScreen('calendar');
  }, [isGuest, screen]);

  const handleActivityCreated = useCallback(async (
    data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>,
    seats: number
  ) => {
    const activity = await createActivity(data);
    await addEscort({
      activityId: activity.id,
      parentId: data.createdByParentId,
      parentName: data.createdByParentName,
      phone: currentUser?.phone ?? '',
      seats,
      isCreator: true,
    });
    return activity;
  }, [createActivity, currentUser]);

  const handleDelete = useCallback(async (activity: Activity) => {
    await deleteActivity(activity.id);
    setSelectedActivity(null);
  }, [deleteActivity]);

  const openLogin = useCallback(() => setShowAuth(true), []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="text-4xl mb-3">🏕️</div>
          <div className="text-slate-500">טוען...</div>
        </div>
      </div>
    );
  }

  // ── Auth screen ──────────────────────────────────────────────
  if (showAuth) {
    return <AuthFlow onBack={isGuest ? () => setShowAuth(false) : undefined} />;
  }

  // ── Admin screen ─────────────────────────────────────────────
  if (!isGuest && isAdmin && screen === 'admin') return (
    <AdminScreen
      activities={activities}
      allEscorts={allEscorts}
      allRegistrations={allRegistrations}
      onBack={() => setScreen('calendar')}
    />
  );

  // ── Protected screens (logged-in only) ───────────────────────
  if (!isGuest && screen === 'family') return (
    <FamilyScreen
      onBack={() => setScreen('calendar')}
      onGoToCalendar={() => setScreen('calendar')}
    />
  );
  if (!isGuest && screen === 'status') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <NavBar screen={screen} setScreen={setScreen} isGuest={false} onLoginClick={openLogin} />
        <StatusScreen
          activitiesCount={activities.length}
          registrationsCount={allRegistrations.length}
          allEscorts={allEscorts}
          allRegistrations={allRegistrations}
          activities={activities}
          onBack={() => setScreen('calendar')}
        />
      </div>
    );
  }

  // ── Main app (calendar + modals) ─────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <NavBar screen={screen} setScreen={setScreen} isGuest={isGuest} onLoginClick={openLogin} />

      {/* Guest banner */}
      {isGuest && (
        <div className="mx-3 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm text-amber-800">
          אתם צופים בלוח כאורחים. לרישום ופעולות — לחצו על הכפתור למעלה.
        </div>
      )}

      {/* Create activity button (parents only) */}
      {!isGuest && isParent && screen === 'calendar' && (
        <div className="px-4 pt-3 flex justify-end">
          <button
            onClick={() => { setSelectedDate(dayViewDate); setShowCreateModal(true); }}
            className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm flex items-center gap-2"
          >
            <span className="text-base">+</span>
            הוסף פעילות
          </button>
        </div>
      )}

      {/* Calendar view */}
      {screen === 'calendar' && (
        <div className="flex-1 p-2 md:p-4">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">
              טוען לוח...
            </div>
          ) : (
            <CalendarView
              ref={calendarRef}
              activities={activities}
              allEscorts={allEscorts}
              allRegistrations={allRegistrations}
              isGuest={isGuest}
              onActivityClick={(a) => { setSelectedActivity(a); setEditActivity(null); }}
              onDateClick={!isGuest ? (date) => { setSelectedDate(date); setShowCreateModal(true); } : undefined}
              onNavigatedToDate={setDayViewDate}
            />
          )}
        </div>
      )}

      {!isGuest && screen === 'reminders' && isParent && (
        <RemindersScreen
          activities={activities}
          allEscorts={allEscorts}
          allRegistrations={allRegistrations}
          onActivityUpdated={() => { /* real-time auto-updates */ }}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <ActivityModal
          onClose={() => setShowCreateModal(false)}
          initialDate={selectedDate ?? undefined}
          initialEscortSeats={pendingSeats}
          onEscortSeatsChange={setPendingSeats}
          onSave={async (data, seats) => {
            await handleActivityCreated(data, seats);
            setShowCreateModal(false);
            calendarRef.current?.goToMonth();
          }}
        />
      )}

      {/* Edit modal */}
      {editActivity && (
        <ActivityModal
          onClose={() => setEditActivity(null)}
          editActivity={editActivity}
          initialEscortSeats={allEscorts.find((e) => e.activityId === editActivity.id && e.isCreator)?.seats ?? 4}
          onSave={async (data) => {
            await updateActivity(editActivity.id, data);
            setEditActivity(null);
          }}
        />
      )}

      {/* Activity details */}
      {selectedActivity && !editActivity && (
        <ActivityDetails
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          isGuest={isGuest}
          onLoginClick={openLogin}
          onEdit={!isGuest ? () => {
            setEditActivity(selectedActivity);
            setSelectedActivity(null);
          } : undefined}
          onDelete={!isGuest ? () => handleDelete(selectedActivity) : undefined}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
