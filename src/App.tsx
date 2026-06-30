import { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import ParentRegistrationScreen from './components/auth/ParentRegistrationScreen';
import CalendarView from './components/calendar/CalendarView';
import ActivityModal from './components/activities/ActivityModal';
import ActivityDetails from './components/activities/ActivityDetails';
import RemindersScreen from './components/reminders/RemindersScreen';
import FamilyScreen from './components/family/FamilyScreen';
import { useActivities } from './hooks/useActivities';
import type { Activity, ActivityEscort, ActivityRegistration } from './types';
import { getAllEscorts, getAllRegistrations, addEscort } from './firebase/db';

type Screen = 'calendar' | 'reminders' | 'family';
type AuthScreen = 'login' | 'register';

function NavBar({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const { currentUser, isParent } = useAuth();

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
        {isParent && (
          <button
            onClick={() => setScreen('reminders')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${screen === 'reminders' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            📨 תזכורות
          </button>
        )}
        <button
          onClick={() => setScreen('family')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${screen === 'family' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          👤 {currentUser?.firstName}
        </button>
      </div>
    </nav>
  );
}

function AppInner() {
  const { currentUser, loading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [screen, setScreen] = useState<Screen>('calendar');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [allEscorts, setAllEscorts] = useState<ActivityEscort[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<ActivityRegistration[]>([]);
  const [pendingSeats, setPendingSeats] = useState(4);

  const { activities, createActivity, updateActivity, deleteActivity, reload } = useActivities();

  const { isParent } = useAuth();

  const loadGlobal = useCallback(async () => {
    const [escorts, regs] = await Promise.all([getAllEscorts(), getAllRegistrations()]);
    setAllEscorts(escorts);
    setAllRegistrations(regs);
  }, []);

  useEffect(() => { loadGlobal(); }, [loadGlobal]);

  const handleActivityCreated = useCallback(async (data: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>, seats: number) => {
    const activity = await createActivity(data);
    // Auto-add creator as escort
    const escort = await addEscort({
      activityId: activity.id,
      parentId: data.createdByParentId,
      parentName: data.createdByParentName,
      phone: '',
      seats,
      isCreator: true,
    });
    setAllEscorts((prev) => [...prev, escort]);
    return activity;
  }, [createActivity]);

  const handleActivityUpdated = useCallback(() => {
    reload();
    loadGlobal();
  }, [reload, loadGlobal]);

  const handleDelete = useCallback(async (activity: Activity) => {
    await deleteActivity(activity.id);
    setSelectedActivity(null);
    await loadGlobal();
  }, [deleteActivity, loadGlobal]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-lg">טוען...</div>
      </div>
    );
  }

  if (!currentUser) {
    if (authScreen === 'register') {
      return <ParentRegistrationScreen onBack={() => setAuthScreen('login')} />;
    }
    return <LoginScreen onGoRegister={() => setAuthScreen('register')} />;
  }

  if (screen === 'family') {
    return <FamilyScreen onBack={() => setScreen('calendar')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <NavBar screen={screen} setScreen={setScreen} />

      {/* Add activity button — parents only */}
      {isParent && screen === 'calendar' && (
        <div className="px-4 pt-3 flex justify-end">
          <button
            onClick={() => { setSelectedDate(null); setShowCreateModal(true); }}
            className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm flex items-center gap-2"
          >
            <span className="text-base">+</span>
            הוסף פעילות
          </button>
        </div>
      )}

      {screen === 'calendar' && (
        <div className="flex-1 p-2 md:p-4">
          <CalendarView
            activities={activities}
            allEscorts={allEscorts}
            allRegistrations={allRegistrations}
            onActivityClick={(a) => { setSelectedActivity(a); setEditActivity(null); }}
            onDateClick={(date) => { setSelectedDate(date); setShowCreateModal(true); }}
          />
        </div>
      )}

      {screen === 'reminders' && isParent && (
        <RemindersScreen
          activities={activities}
          allEscorts={allEscorts}
          allRegistrations={allRegistrations}
          onActivityUpdated={handleActivityUpdated}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <ActivityModal
          onClose={() => setShowCreateModal(false)}
          initialDate={selectedDate ?? undefined}
          onSave={async (data) => {
            await handleActivityCreated(data, pendingSeats);
            setShowCreateModal(false);
          }}
          onEscortSeatsChange={setPendingSeats}
          initialEscortSeats={pendingSeats}
        />
      )}

      {/* Edit modal */}
      {editActivity && (
        <ActivityModal
          onClose={() => setEditActivity(null)}
          editActivity={editActivity}
          onSave={async (data) => {
            await updateActivity(editActivity.id, data);
            setEditActivity(null);
            await loadGlobal();
          }}
        />
      )}

      {/* Activity details */}
      {selectedActivity && !editActivity && (
        <ActivityDetails
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onEdit={() => {
            setEditActivity(selectedActivity);
            setSelectedActivity(null);
          }}
          onDelete={() => handleDelete(selectedActivity)}
          onActivityUpdated={handleActivityUpdated}
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
