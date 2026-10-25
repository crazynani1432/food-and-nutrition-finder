import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Camera, 
  PlusCircle, 
  History as HistoryIcon, 
  User as UserIcon, 
  Trash2, 
  Plus, 
  Search, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  Scale,
  LogOut,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  Image as ImageIcon,
  X
} from 'lucide-react';
import AuthScreen from './components/AuthScreen';
import HealthMetricsModal from './components/HealthMetricsModal';

// Date utility functions
function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHumanDate(dateStr) {
  if (!dateStr) return '';
  const today = getLocalDateString();
  const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
  
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

// local seed list fallback for search when server is offline
const LOCAL_SEEDS = [
  { id: '1', name: 'Cooked White Rice', regionalName: 'Chawal', caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0.4, servingUnitDefault: 'bowl', conversionToGrams: 150 },
  { id: '2', name: 'Chapati (Whole Wheat Roti)', regionalName: 'Roti', caloriesPer100g: 260, proteinPer100g: 8.0, carbsPer100g: 55, fatPer100g: 1.5, fiberPer100g: 7.0, servingUnitDefault: 'piece', conversionToGrams: 40 },
  { id: '3', name: 'Dal Tadka (Cooked)', regionalName: 'Yellow Dal', caloriesPer100g: 110, proteinPer100g: 5.0, carbsPer100g: 16, fatPer100g: 3.5, fiberPer100g: 4.0, servingUnitDefault: 'bowl', conversionToGrams: 150 },
  { id: '4', name: 'Paneer Butter Masala', regionalName: 'Paneer Curry', caloriesPer100g: 220, proteinPer100g: 9.0, carbsPer100g: 8, fatPer100g: 18, fiberPer100g: 1.5, servingUnitDefault: 'bowl', conversionToGrams: 200 },
  { id: '5', name: 'Idli (Steam cooked)', regionalName: 'Idli', caloriesPer100g: 120, proteinPer100g: 3.0, carbsPer100g: 26, fatPer100g: 0.2, fiberPer100g: 1.0, servingUnitDefault: 'piece', conversionToGrams: 40 },
  { id: '6', name: 'Masala Dosa', regionalName: 'Dosa', caloriesPer100g: 180, proteinPer100g: 4.0, carbsPer100g: 29, fatPer100g: 5.5, fiberPer100g: 1.8, servingUnitDefault: 'piece', conversionToGrams: 120 },
  { id: '7', name: 'Sambar', regionalName: 'Sambar', caloriesPer100g: 80, proteinPer100g: 3.0, carbsPer100g: 12, fatPer100g: 2.0, fiberPer100g: 2.5, servingUnitDefault: 'bowl', conversionToGrams: 150 },
  { id: '8', name: 'Curd (Whole Milk)', regionalName: 'Dahi', caloriesPer100g: 60, proteinPer100g: 3.2, carbsPer100g: 4.7, fatPer100g: 3.2, fiberPer100g: 0, servingUnitDefault: 'cup', conversionToGrams: 150 }
];

const API_URL = 'http://localhost:5000';

const DEFAULT_PROFILE = {
  isCompleted: false,
  age: 26,
  heightCm: 172,
  weightKg: 68,
  activityLevel: 'moderately_active',
  fitnessGoal: 'maintain_weight',
  dietaryPreference: 'omnivore',
  dailyCalorieTarget: 2000,
  dailyProteinTargetG: 100,
  dailyCarbsTargetG: 250,
  dailyFatTargetG: 65,
  dailyFiberTargetG: 28
};

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('foodplate_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${response.status}`);
  }

  return response.json();
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [meals, setMeals] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [showMetricsModal, setShowMetricsModal] = useState(false);

  // Sync isolated user data from backend
  const loadUserData = async (token) => {
    try {
      // 1. Fetch user's individual profile
      const profileRes = await fetch(`${API_URL}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const backendProfile = await profileRes.json();
        if (backendProfile && backendProfile.dailyCalorieTarget) {
          setProfile(backendProfile);
          localStorage.setItem('foodplate_profile', JSON.stringify(backendProfile));
          if (!backendProfile.isCompleted) {
            setShowMetricsModal(true);
          } else {
            setShowMetricsModal(false);
          }
        }
      }

      // 2. Fetch user's individual meals history
      const mealsRes = await fetch(`${API_URL}/api/meals/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (mealsRes.ok) {
        const backendMeals = await mealsRes.json();
        const formattedMeals = backendMeals.map(m => ({
          id: m.id,
          mealType: m.mealType,
          logDate: m.logDate,
          logTime: m.logTime ? m.logTime.slice(0, 5) : '',
          totalCalories: Math.round(m.totalCalories),
          totalProteinG: m.totalProteinG,
          totalCarbsG: m.totalCarbsG,
          totalFatG: m.totalFatG,
          totalFiberG: m.totalFiberG,
          analysisMethod: m.analysisMethod,
          imageUrl: m.imageUrl,
          items: m.MealItems ? m.MealItems.map(item => ({
            foodName: item.Food ? item.Food.name : item.foodName,
            loggedQuantity: item.loggedQuantity,
            loggedUnit: item.loggedUnit,
            calories: Math.round(item.calories)
          })) : []
        }));
        setMeals(formattedMeals);
        localStorage.setItem('foodplate_meals', JSON.stringify(formattedMeals));
      }
      setIsOnline(true);
    } catch (err) {
      console.warn("Could not sync data from server, using local fallback:", err);
      setIsOnline(false);
    }
  };

  // Check saved session on mount
  useEffect(() => {
    async function verifyExistingSession() {
      const token = localStorage.getItem('foodplate_token');
      const savedUserStr = localStorage.getItem('foodplate_user');

      if (!token) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          localStorage.setItem('foodplate_user', JSON.stringify(data.user));
          await loadUserData(token);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (e) {
        // If server is unreachable but user was cached
        if (savedUserStr) {
          try {
            setCurrentUser(JSON.parse(savedUserStr));
            const savedMeals = localStorage.getItem('foodplate_meals');
            const savedProfile = localStorage.getItem('foodplate_profile');
            if (savedMeals) setMeals(JSON.parse(savedMeals));
            if (savedProfile) {
              const parsedProfile = JSON.parse(savedProfile);
              setProfile(parsedProfile);
              if (!parsedProfile.isCompleted) {
                setShowMetricsModal(true);
              }
            }
          } catch (_) {}
        }
        setIsOnline(false);
      } finally {
        setIsAuthLoading(false);
      }
    }

    verifyExistingSession();
  }, []);

  const handleLoginSuccess = async (userData, token) => {
    setCurrentUser(userData);
    localStorage.setItem('foodplate_token', token);
    localStorage.setItem('foodplate_user', JSON.stringify(userData));
    await loadUserData(token);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('foodplate_token');
    localStorage.removeItem('foodplate_user');
    localStorage.removeItem('foodplate_meals');
    localStorage.removeItem('foodplate_profile');
    setCurrentUser(null);
    setMeals([]);
    setProfile(DEFAULT_PROFILE);
    setShowMetricsModal(false);
    setActiveTab('dashboard');
  };

  // Save changes wrapper
  const saveMeals = (updatedMeals) => {
    setMeals(updatedMeals);
    localStorage.setItem('foodplate_meals', JSON.stringify(updatedMeals));
  };

  const saveProfileSettings = (updatedProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('foodplate_profile', JSON.stringify(updatedProfile));
  };

  const handleSaveMetrics = async (updatedProfile) => {
    if (isOnline) {
      try {
        await apiRequest('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updatedProfile)
        });
      } catch (err) {
        console.error('Failed to save profile metrics to server:', err);
      }
    }
    saveProfileSettings({ ...updatedProfile, isCompleted: true });
    setShowMetricsModal(false);
  };

  // 1. Loading splash
  if (isAuthLoading) {
    return (
      <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-950/80 shadow-2xl relative border-x border-slate-800/40 items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shadow-indigo-600/30 animate-pulse mb-4">
          F
        </div>
        <h2 className="text-base font-bold text-slate-200">Loading FoodPlate...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to your personal nutrition account...</p>
      </div>
    );
  }

  // 2. Individual Authentication Screen
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} isOnline={isOnline} />;
  }

  // 3. Authenticated App Screen
  return (
    <div className="flex flex-col min-h-screen pb-24 max-w-md mx-auto bg-slate-950/60 shadow-2xl relative border-x border-slate-800/40">
      {/* Header Bar */}
      <header className="px-5 py-3.5 glass-panel border-t-0 border-x-0 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
            F
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 text-base leading-tight tracking-tight font-display">FoodPlate</h1>
            <p className="text-[9px] text-indigo-400 font-semibold tracking-wider uppercase">AI Nutrition Tracker</p>
          </div>
        </div>

        {/* User Badge & Actions */}
        <div className="flex items-center gap-2">
          {/* Individual User Pill */}
          <button
            onClick={() => setActiveTab('profile')}
            title="View personal profile"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 text-slate-200 transition-all text-left"
          >
            <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
            </span>
            <span className="text-[11px] font-bold max-w-[75px] truncate">
              {currentUser?.name || 'User'}
            </span>
          </button>

          {/* Quick Sign Out Button */}
          <button
            onClick={handleLogout}
            title="Sign out of account"
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <Dashboard 
            meals={meals} 
            profile={profile} 
            setActiveTab={setActiveTab} 
            saveMeals={saveMeals} 
            isOnline={isOnline} 
            onOpenMetricsModal={() => setShowMetricsModal(true)}
          />
        )}
        {activeTab === 'camera' && <CameraScanner meals={meals} saveMeals={saveMeals} setActiveTab={setActiveTab} isOnline={isOnline} />}
        {activeTab === 'manual' && <ManualLogger meals={meals} saveMeals={saveMeals} setActiveTab={setActiveTab} isOnline={isOnline} />}
        {activeTab === 'history' && (
          <History 
            meals={meals} 
            profile={profile} 
            saveMeals={saveMeals} 
            isOnline={isOnline} 
            setActiveTab={setActiveTab} 
          />
        )}
        {activeTab === 'profile' && (
          <Profile 
            profile={profile} 
            saveProfileSettings={saveProfileSettings} 
            isOnline={isOnline} 
            currentUser={currentUser} 
            onLogout={handleLogout} 
          />
        )}
      </main>

      {/* Mandatory Nutrition & Health Matrix Popup Notification (enforced until completed) */}
      {(showMetricsModal || (currentUser && !profile?.isCompleted)) && (
        <HealthMetricsModal 
          profile={profile} 
          currentUser={currentUser} 
          onSaveMetrics={handleSaveMetrics} 
          isOnline={isOnline} 
        />
      )}

      {/* Bottom Glass Navigation Tab Bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md h-20 glass-panel border-b-0 border-x-0 px-4 flex items-center justify-around rounded-t-2xl z-40">
        <TabButton id="dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={setActiveTab} />
        <TabButton id="camera" icon={<Camera size={20} />} label="AI Plate" active={activeTab === 'camera'} onClick={setActiveTab} />
        <TabButton id="manual" icon={<PlusCircle size={20} />} label="Log Food" active={activeTab === 'manual'} onClick={setActiveTab} />
        <TabButton id="history" icon={<HistoryIcon size={20} />} label="History" active={activeTab === 'history'} onClick={setActiveTab} />
        <TabButton id="profile" icon={<UserIcon size={20} />} label="Profile" active={activeTab === 'profile'} onClick={setActiveTab} />
      </nav>
    </div>
  );
}


// Navigation Button Helper
function TabButton({ id, icon, label, active, onClick }) {
  return (
    <button 
      onClick={() => onClick(id)}
      className={`flex flex-col items-center justify-center gap-1.5 w-14 h-14 rounded-xl transition-all ${
        active 
          ? 'text-indigo-400 scale-105' 
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------
// 1. DASHBOARD COMPONENT (Live Date Progress & Quick Actions)
// ---------------------------------------------------------------------
function Dashboard({ meals, profile, setActiveTab, saveMeals, isOnline, onOpenMetricsModal }) {
  const todayStr = getLocalDateString();
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // 1. Live Today Progress Calculations (Specific to Live Today)
  const todayMeals = meals.filter(m => m.logDate === todayStr);
  const liveTotals = todayMeals.reduce((acc, m) => {
    acc.calories += m.totalCalories || 0;
    acc.protein += m.totalProteinG || 0;
    acc.carbs += m.totalCarbsG || 0;
    acc.fat += m.totalFatG || 0;
    acc.fiber += m.totalFiberG || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  Object.keys(liveTotals).forEach(k => liveTotals[k] = Math.round(liveTotals[k]));
  const liveCalorieProgress = Math.min((liveTotals.calories / profile.dailyCalorieTarget) * 100, 100);
  const liveRemainingCalories = Math.max(profile.dailyCalorieTarget - liveTotals.calories, 0);

  const handleDeleteMeal = async (id) => {
    if (isOnline) {
      try {
        await apiRequest(`/api/meals/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error("Failed to delete meal:", err);
      }
    }
    saveMeals(meals.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Action Required Alert Banner if Nutrition & Health Matrix is incomplete */}
      {!profile?.isCompleted && (
        <div 
          onClick={onOpenMetricsModal}
          className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-all shadow-lg shadow-amber-950/20 animate-pulse"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-300">Action Required: Health Matrix Incomplete</h4>
              <p className="text-[10px] text-slate-300">Tap here to complete & calibrate your targets</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 shrink-0">
            Fill Now
          </span>
        </div>
      )}

      {/* QUICK LOGGING ACTIONS (TOP OF DASHBOARD) */}
      <div className="grid grid-cols-2 gap-3.5">
        <button 
          onClick={() => setActiveTab('camera')}
          className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center cursor-pointer border border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 to-slate-900/70 shadow-lg shadow-indigo-950/30 group transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-md shadow-indigo-500/20">
            <Camera size={22} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">
              Analyze Plate
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-tight">
              Snap food photo & compute
            </p>
          </div>
        </button>

        <button 
          onClick={() => setActiveTab('manual')}
          className="glass-panel glass-panel-hover rounded-2xl p-4 flex flex-col items-center gap-2.5 text-center cursor-pointer border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 to-slate-900/70 shadow-lg shadow-emerald-950/30 group transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-md shadow-emerald-500/20">
            <PlusCircle size={22} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-100 group-hover:text-emerald-300 transition-colors">
              Log Food
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-tight">
              Search & log ingredients
            </p>
          </div>
        </button>
      </div>

      {/* SECTION: LIVE DATE PROGRESS (Main Dashboard Live Status) */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col items-center relative overflow-hidden border border-slate-800/80 shadow-2xl">
        {/* Live Date Header Badge */}
        <div className="flex items-center justify-between w-full mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-extrabold text-slate-200 tracking-wide uppercase">
              Live Progress • Today
            </span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            {formatFullDate(todayStr)}
          </span>
        </div>

        {/* Circular Live Calorie Gauge */}
        <div className="relative w-44 h-44 flex items-center justify-center my-1">
          <svg className="w-full h-full radial-progress-ring">
            <circle className="text-slate-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="76" cx="88" cy="88"/>
            <circle 
              className="text-indigo-500 transition-all duration-500 ease-out" 
              strokeWidth="10" 
              strokeDasharray={2 * Math.PI * 76}
              strokeDashoffset={2 * Math.PI * 76 * (1 - liveCalorieProgress / 100)}
              strokeLinecap="round" 
              stroke="currentColor" 
              fill="transparent" 
              r="76" 
              cx="88" 
              cy="88"
            />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-3xl font-extrabold font-display leading-none text-slate-100">{liveTotals.calories}</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-wider">Kcal Consumed</span>
            <div className="w-12 h-px bg-slate-800 my-1.5"></div>
            <span className={`text-[11px] font-bold ${liveRemainingCalories === 0 ? 'text-amber-400' : 'text-indigo-300'}`}>
              {liveRemainingCalories > 0 ? `${liveRemainingCalories} kcal left` : 'Target Reached'}
            </span>
          </div>
        </div>

        {/* Targets Banner */}
        <div className="w-full grid grid-cols-2 mt-4 border-t border-slate-800/50 pt-3 text-center">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Daily Target</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">{profile.dailyCalorieTarget} kcal</p>
          </div>
          <div className="border-l border-slate-800/50">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Remaining</p>
            <p className="text-sm font-bold text-slate-200 mt-0.5">{liveRemainingCalories} kcal</p>
          </div>
        </div>

        {/* Live Macronutrient Mini Pills */}
        <div className="w-full grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/40 text-center">
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <p className="text-[9px] text-slate-400 font-semibold uppercase">Protein</p>
            <p className="text-xs font-bold text-emerald-400 mt-0.5">{liveTotals.protein}/{profile.dailyProteinTargetG}g</p>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <p className="text-[9px] text-slate-400 font-semibold uppercase">Carbs</p>
            <p className="text-xs font-bold text-amber-400 mt-0.5">{liveTotals.carbs}/{profile.dailyCarbsTargetG}g</p>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <p className="text-[9px] text-slate-400 font-semibold uppercase">Fats</p>
            <p className="text-xs font-bold text-rose-400 mt-0.5">{liveTotals.fat}/{profile.dailyFatTargetG}g</p>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <p className="text-[9px] text-slate-400 font-semibold uppercase">Fiber</p>
            <p className="text-xs font-bold text-teal-400 mt-0.5">{liveTotals.fiber}/{profile.dailyFiberTargetG}g</p>
          </div>
        </div>
      </div>

      {/* QUICK JUMP TO DATE-WISE ACTIVITY LOGS IN HISTORY */}
      <button
        onClick={() => setActiveTab('history')}
        className="w-full py-3.5 px-4 rounded-2xl glass-panel border border-indigo-500/30 hover:border-indigo-500/60 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-violet-950/40 flex items-center justify-between text-left transition-all cursor-pointer group shadow-lg shadow-indigo-950/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-100 group-hover:text-indigo-300 transition-colors">
              Date-Wise Activity Logs
            </h4>
            <p className="text-[10px] text-slate-400">
              Browse past dates, consumed meals breakdown, nutrient targets & photos
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
      </button>

      {/* TODAY'S CONSUMED MEALS */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-xl flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="text-indigo-400" />
            Today's Consumed Meals ({todayMeals.length})
          </h3>
          <span className="text-[11px] font-bold text-slate-200 bg-slate-900 px-2.5 py-0.5 rounded-lg border border-slate-800">
            {liveTotals.calories} kcal
          </span>
        </div>

        {todayMeals.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {todayMeals.map(meal => (
              <div key={meal.id} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60 flex flex-col gap-2.5 hover:border-slate-700/60 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {meal.imageUrl ? (
                      <div 
                        onClick={() => setActivePhotoModal(meal)}
                        className="w-11 h-11 rounded-lg overflow-hidden border border-slate-700 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <img src={meal.imageUrl} alt="meal thumbnail" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold shrink-0">
                        🍽️
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-100">{meal.mealType}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <Clock size={11} />
                        <span>{meal.logTime || 'Logged'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className={meal.analysisMethod === 'image' ? 'text-indigo-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                          {meal.analysisMethod === 'image' ? 'AI Photo Scan' : 'Manual Entry'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-100 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {meal.totalCalories} kcal
                    </span>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      title="Delete this meal"
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Items in meal */}
                {meal.items && meal.items.length > 0 && (
                  <div className="flex flex-col gap-1 pl-2 border-l-2 border-indigo-500/30 text-[11px] text-slate-300">
                    {meal.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-slate-300">
                        <span className="text-slate-400 truncate max-w-[200px]">
                          {item.foodName} <span className="text-[10px] text-slate-500">x{item.loggedQuantity} {item.loggedUnit || ''}</span>
                        </span>
                        <span className="font-semibold text-slate-300 text-[10px] shrink-0">
                          {item.calories} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Macros pill */}
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-800/40 pt-2 mt-0.5">
                  <span className="text-emerald-400">Protein: {meal.totalProteinG}g</span>
                  <span className="text-amber-400">Carbs: {meal.totalCarbsG}g</span>
                  <span className="text-rose-400">Fat: {meal.totalFatG}g</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center">
            <p className="text-xs font-bold text-slate-300">No meals logged today yet</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Snap a plate photo or log food to begin today's tracker.</p>
          </div>
        )}
      </div>

      {/* Lightbox Photo Preview Modal */}
      {activePhotoModal && (
        <PhotoModal activePhotoModal={activePhotoModal} onClose={() => setActivePhotoModal(null)} />
      )}
    </div>
  );
}

// Reusable Lightbox Photo Modal
function PhotoModal({ activePhotoModal, onClose }) {
  if (!activePhotoModal) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel max-w-sm w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl flex flex-col">
        <div className="relative bg-black h-56 flex items-center justify-center overflow-hidden">
          <img src={activePhotoModal.imageUrl} alt="Meal plate" className="w-full h-full object-contain" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
          <span className="absolute bottom-3 left-3 text-xs font-bold bg-indigo-600/90 text-white px-2.5 py-1 rounded-lg">
            {activePhotoModal.mealType} • {formatHumanDate(activePhotoModal.logDate)}
          </span>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-extrabold text-slate-100">Plate Photo Analysis</h4>
              <p className="text-[10px] text-slate-400">{activePhotoModal.logDate} at {activePhotoModal.logTime || 'N/A'}</p>
            </div>
            <span className="text-base font-black text-indigo-400">{activePhotoModal.totalCalories} kcal</span>
          </div>

          {activePhotoModal.items && activePhotoModal.items.length > 0 && (
            <div className="flex flex-col gap-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identified Ingredients</p>
              {activePhotoModal.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-300">
                  <span>{it.foodName} <span className="text-[10px] text-slate-500">x{it.loggedQuantity}</span></span>
                  <span className="font-bold text-slate-200">{it.calories} kcal</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/40">
            <div>
              <p className="text-[9px] text-slate-500 uppercase">Protein</p>
              <p className="text-emerald-400 mt-0.5">{activePhotoModal.totalProteinG}g</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase">Carbs</p>
              <p className="text-amber-400 mt-0.5">{activePhotoModal.totalCarbsG}g</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase">Fats</p>
              <p className="text-rose-400 mt-0.5">{activePhotoModal.totalFatG}g</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

function NutrientComparisonRow({ name, consumed, target, unit, barColor }) {
  const percentage = target > 0 ? Math.min(Math.round((consumed / target) * 100), 100) : 0;
  const rawPercentage = target > 0 ? Math.round((consumed / target) * 100) : 0;
  const diff = target - consumed;
  const isOver = diff < 0;

  return (
    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/60 flex flex-col gap-2 hover:border-slate-700/60 transition-all">
      {/* Title & Column Values */}
      <div className="grid grid-cols-2 items-center">
        {/* Left Column: Actually Consumed */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-100 font-mono">
            {consumed} <span className="text-[10px] text-slate-400 font-normal">{unit}</span>
          </span>
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
            rawPercentage >= 90 && rawPercentage <= 110 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : rawPercentage > 110 
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
          }`}>
            {rawPercentage}%
          </span>
        </div>

        {/* Right Column: Should Be Consumed */}
        <div className="text-right">
          <span className="text-xs font-bold text-slate-300 font-mono">
            {target} <span className="text-[10px] text-slate-400 font-normal">{unit}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar & Status Balance */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-slate-400 font-semibold">{name}</span>
          <span className={`font-semibold ${isOver ? 'text-amber-400' : 'text-slate-400'}`}>
            {isOver 
              ? `+${Math.abs(Math.round(diff))} ${unit} surplus` 
              : diff === 0 
              ? 'Target reached' 
              : `${Math.round(diff)} ${unit} remaining`}
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${barColor}`} 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 2. CAMERA SCANNER & AI PLATE COMPONENT (Fast Vision Pipeline)
// ---------------------------------------------------------------------
// Fast client-side image optimizer: reduces upload size from ~8MB to ~150KB for instant transmission & fast VLM vision processing
async function optimizeImageForUpload(file, maxDimension = 1024, quality = 0.85) {
  return new Promise((resolve) => {
    // If already small (< 300KB), no need to compress
    if (file.size < 300 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve({ file, dataUrl: reader.result });
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob((blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve({ file: optimizedFile, dataUrl });
          } else {
            resolve({ file, dataUrl: e.target.result });
          }
        }, 'image/jpeg', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function CameraScanner({ meals, saveMeals, setActiveTab, isOnline }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [mealType, setMealType] = useState('Lunch');
  const [logDate, setLogDate] = useState(getLocalDateString());

  // Trigger plate scan workflow with client-side optimization
  const handlePhotoUpload = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    setScanning(true);
    setScanStep(1);

    // Fast image optimization (reduces 8MB to ~150KB in ~20ms)
    const { file: optimizedFile, dataUrl } = await optimizeImageForUpload(rawFile);
    setImagePreview(dataUrl);

    startScanningProcess(optimizedFile);
  };

  const startScanningProcess = async (file) => {
    setScanning(true);
    setScanStep(1);

    if (isOnline) {
      try {
        const formData = new FormData();
        formData.append('image', file);

        const step2Timer = setTimeout(() => setScanStep(2), 600);
        const step3Timer = setTimeout(() => setScanStep(3), 1400);

        const response = await apiRequest('/api/ai/analyze-plate', {
          method: 'POST',
          body: formData
        });

        clearTimeout(step2Timer);
        clearTimeout(step3Timer);
        setScanStep(3);
        setScanning(false);
        setAnalysisResult(response.items);
        setImagePreview(response.imageUrl);
        return;
      } catch (err) {
        console.error("API plate analysis failed:", err);
        setScanning(false);
        setScanStep(0);
        alert(`AI analysis failed: ${err.message}. Please try again in a moment.`);
        return;
      }
    }

    // Mocked response fallback — ONLY when truly offline
    setScanStep(1);
    setTimeout(() => setScanStep(2), 1000);
    setTimeout(() => setScanStep(3), 2000);
    setTimeout(() => {
      setScanning(false);
      setAnalysisResult([
        { id: '1', foodName: 'Cooked White Rice', loggedQuantity: 1.2, loggedUnit: 'bowl', normalizedGrams: 180, calories: 234, protein: 4.86, carbs: 50.4, fat: 0.54, fiber: 0.72, confidence: 0.94 },
        { id: '3', foodName: 'Dal Tadka (Cooked)', loggedQuantity: 1.0, loggedUnit: 'bowl', normalizedGrams: 150, calories: 165, protein: 7.5, carbs: 24.0, fat: 5.25, fiber: 6.0, confidence: 0.88 },
        { id: '8', foodName: 'Curd (Whole Milk)', loggedQuantity: 0.8, loggedUnit: 'cup', normalizedGrams: 120, calories: 72, protein: 3.84, carbs: 5.64, fat: 3.84, fiber: 0, confidence: 0.72 }
      ]);
    }, 3200);
  };

  // Human correction logic
  const handleItemQtyChange = (idx, newQty) => {
    if (newQty <= 0) return;
    const itemsCopy = [...analysisResult];
    const item = itemsCopy[idx];
    const multiplier = newQty / item.loggedQuantity;

    item.loggedQuantity = Number(newQty);
    item.normalizedGrams = Math.round(item.normalizedGrams * multiplier);
    item.calories = Math.round(item.calories * multiplier);
    item.protein = Number((item.protein * multiplier).toFixed(1));
    item.carbs = Number((item.carbs * multiplier).toFixed(1));
    item.fat = Number((item.fat * multiplier).toFixed(1));
    item.fiber = Number((item.fiber * multiplier).toFixed(1));

    setAnalysisResult(itemsCopy);
  };

  const handleItemDelete = (idx) => {
    const filtered = analysisResult.filter((_, i) => i !== idx);
    setAnalysisResult(filtered);
  };

  const handleSaveMeal = async () => {
    if (analysisResult.length === 0) return;

    const totals = analysisResult.reduce((acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      acc.fiber += item.fiber;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    const newMealRecord = {
      id: Date.now().toString(),
      mealType,
      logDate,
      logTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalCalories: Math.round(totals.calories),
      totalProteinG: Number(totals.protein.toFixed(1)),
      totalCarbsG: Number(totals.carbs.toFixed(1)),
      totalFatG: Number(totals.fat.toFixed(1)),
      totalFiberG: Number(totals.fiber.toFixed(1)),
      analysisMethod: 'image',
      imageUrl: imagePreview,
      items: analysisResult.map(item => ({
        foodName: item.foodName,
        loggedQuantity: item.loggedQuantity,
        loggedUnit: item.loggedUnit,
        calories: item.calories
      }))
    };

    if (isOnline) {
      try {
        const mealData = {
          mealType,
          logDate,
          logTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          analysisMethod: 'image',
          imageUrl: imagePreview,
          items: analysisResult.map(item => ({
            foodId: item.foodId,
            loggedQuantity: item.loggedQuantity,
            loggedUnit: item.loggedUnit,
            estimationType: item.estimationType || 'ai_estimated'
          }))
        };
        await apiRequest('/api/meals', {
          method: 'POST',
          body: JSON.stringify(mealData)
        });

        const historyRes = await apiRequest('/api/meals/history');
        const formattedMeals = historyRes.map(m => ({
          id: m.id,
          mealType: m.mealType,
          logDate: m.logDate,
          logTime: m.logTime ? m.logTime.slice(0, 5) : '',
          totalCalories: Math.round(m.totalCalories),
          totalProteinG: m.totalProteinG,
          totalCarbsG: m.totalCarbsG,
          totalFatG: m.totalFatG,
          totalFiberG: m.totalFiberG,
          analysisMethod: m.analysisMethod,
          imageUrl: m.imageUrl,
          items: m.MealItems ? m.MealItems.map(item => ({
            foodName: item.Food ? item.Food.name : item.foodName,
            loggedQuantity: item.loggedQuantity,
            loggedUnit: item.loggedUnit,
            calories: Math.round(item.calories)
          })) : []
        }));
        saveMeals(formattedMeals);
        setActiveTab('dashboard');
        return;
      } catch (err) {
        console.error("Failed to log plate to backend:", err);
      }
    }

    saveMeals([newMealRecord, ...meals]);
    setActiveTab('dashboard');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {!imagePreview && (
        <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center border-dashed border-2 border-slate-700/60 min-h-80 text-center">
          <Camera size={44} className="text-indigo-400 mb-4 animate-bounce" />
          <h3 className="text-base font-bold text-slate-200">Scan Meal Plate</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[240px]">Snap food plate photo to perform automatic caloric analysis</p>
          
          <label className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-bold rounded-lg cursor-pointer shadow-lg shadow-indigo-600/20">
            Select Photo
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
      )}

      {scanning && (
        <div className="glass-panel rounded-2xl p-8 flex flex-col items-center justify-center min-h-80 text-center relative overflow-hidden">
          {imagePreview && (
            <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[1px]" alt="scanning backdrop" />
          )}
          <div className="w-16 h-16 rounded-full border-4 border-t-indigo-500 border-r-indigo-500/20 border-b-indigo-500/20 border-l-indigo-500/20 animate-spin mb-6"></div>
          <h3 className="text-base font-extrabold text-slate-200 font-display">AI Engine Analyzing Plate</h3>
          
          <div className="mt-6 flex flex-col gap-2 w-full max-w-[180px]">
            <ScanLoadingStep stepId={1} currentStep={scanStep} label="Reading image details..." />
            <ScanLoadingStep stepId={2} currentStep={scanStep} label="Segmenting components..." />
            <ScanLoadingStep stepId={3} currentStep={scanStep} label="Matching IFCT databases..." />
          </div>
        </div>
      )}

      {imagePreview && !scanning && analysisResult && (
        <div className="flex flex-col gap-5">
          {/* Header Image box */}
          <div className="relative rounded-2xl overflow-hidden h-40 border border-slate-800/60 shadow-lg">
            <img src={imagePreview} className="w-full h-full object-cover" alt="food plate preview" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-1 rounded bg-slate-900/80 border border-slate-800 text-indigo-300">
                📷 Plate Analysis View
              </span>
              <button 
                onClick={() => { setImagePreview(null); setAnalysisResult(null); }}
                className="text-[10px] text-slate-300 hover:text-white bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80"
              >
                Retake
              </button>
            </div>
          </div>

          {/* Select Date & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 bg-slate-900/40 border border-slate-800/50 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400">Log Date</span>
              <input 
                type="date" 
                value={logDate} 
                onChange={e => setLogDate(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1 font-semibold text-slate-200 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1 bg-slate-900/40 border border-slate-800/50 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400">Meal Category</span>
              <select 
                value={mealType} 
                onChange={e => setMealType(e.target.value)}
                className="text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1 font-semibold text-slate-200 outline-none"
              >
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400">
            <AlertTriangle size={13} className="shrink-0" />
            <span>AI weights are estimates. Please correct quantities as needed.</span>
          </div>

          {/* Core detected list */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detected Ingredients</h4>
            {analysisResult.map((item, idx) => (
              <div key={idx} className="glass-panel rounded-xl p-4 flex flex-col gap-3 border border-slate-800/60">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-200">{item.foodName}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">{item.normalizedGrams}g weight</span>
                      <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                      <span className={`text-[10px] font-semibold ${item.confidence > 0.85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {Math.round(item.confidence * 100)}% match
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleItemDelete(idx)} className="text-slate-400 hover:text-rose-400 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-3 border-t border-slate-800/30 pt-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-400 font-semibold">Qty:</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0.1" 
                      value={item.loggedQuantity} 
                      onChange={e => handleItemQtyChange(idx, e.target.value)}
                      className="w-16 text-center text-xs font-bold glass-input py-0.5 rounded"
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-semibold lowercase">{item.loggedUnit}</span>
                  <div className="ml-auto text-xs font-bold text-slate-200">
                    {item.calories} kcal
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Confirm Button */}
          <button 
            onClick={handleSaveMeal}
            className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            Confirm & Log Meal
          </button>
        </div>
      )}
    </div>
  );
}

function ScanLoadingStep({ stepId, currentStep, label }) {
  const active = currentStep >= stepId;
  const completed = currentStep > stepId;
  return (
    <div className={`flex items-center gap-2.5 text-xs text-left ${active ? 'text-slate-200' : 'text-slate-600'}`}>
      <div className={`w-2 h-2 rounded-full ${completed ? 'bg-indigo-500' : active ? 'bg-indigo-400 animate-ping' : 'bg-slate-800'}`}></div>
      <span className={completed ? 'line-through text-slate-500' : ''}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------
// 3. MANUAL LOGGER COMPONENT
// ---------------------------------------------------------------------
function ManualLogger({ meals, saveMeals, setActiveTab, isOnline }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [loggedQuantity, setLoggedQuantity] = useState(1);
  const [loggedUnit, setLoggedUnit] = useState('bowl');
  const [mealItems, setMealItems] = useState([]);
  const [mealType, setMealType] = useState('Lunch');
  const [logDate, setLogDate] = useState(getLocalDateString());

  // Trigger search using backend if online, fallback to local seeds
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    let active = true;

    async function searchFoodItems() {
      if (isOnline) {
        try {
          const results = await apiRequest(`/api/foods/search?q=${encodeURIComponent(searchQuery)}`);
          if (active) {
            setSearchResults(results.map(f => ({
              id: f.id,
              name: f.name,
              regionalName: f.regionalName || '',
              caloriesPer100g: f.caloriesPer100g,
              proteinPer100g: f.proteinPer100g,
              carbsPer100g: f.carbsPer100g,
              fatPer100g: f.fatPer100g,
              fiberPer100g: f.fiberPer100g,
              sodiumPer100g: f.sodiumPer100g,
              servingUnitDefault: f.servingUnitDefault,
              conversionToGrams: f.conversionToGrams,
              servingSizeDefault: f.servingSizeDefault
            })));
          }
          return;
        } catch (err) {
          console.warn("Backend search failed, searching local seeds:", err);
        }
      }

      if (active) {
        const filtered = LOCAL_SEEDS.filter(food => 
          food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          food.regionalName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered);
      }
    }

    searchFoodItems();

    return () => {
      active = false;
    };
  }, [searchQuery, isOnline]);

  const handleSelectFood = (food) => {
    setSelectedFood(food);
    setLoggedUnit(food.servingUnitDefault);
    setLoggedQuantity(food.servingSizeDefault);
  };

  const handleAddFoodToMeal = () => {
    if (!selectedFood) return;

    const conversion = selectedFood.conversionToGrams;
    const normalizedGrams = Math.round(loggedQuantity * conversion);
    const scale = normalizedGrams / 100;

    const calculated = {
      foodId: selectedFood.id,
      foodName: selectedFood.name,
      loggedQuantity,
      loggedUnit,
      normalizedGrams,
      calories: Math.round(selectedFood.caloriesPer100g * scale),
      protein: Number((selectedFood.proteinPer100g * scale).toFixed(1)),
      carbs: Number((selectedFood.carbsPer100g * scale).toFixed(1)),
      fat: Number((selectedFood.fatPer100g * scale).toFixed(1)),
      fiber: Number((selectedFood.fiberPer100g * scale).toFixed(1))
    };

    setMealItems([...mealItems, calculated]);
    setSelectedFood(null);
    setSearchQuery('');
  };

  const handleRemoveMealItem = (idx) => {
    setMealItems(mealItems.filter((_, i) => i !== idx));
  };

  const handleLogMeal = async () => {
    if (mealItems.length === 0) return;

    const totals = mealItems.reduce((acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      acc.fiber += item.fiber;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    const newMeal = {
      id: Date.now().toString(),
      mealType,
      logDate,
      logTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      totalCalories: Math.round(totals.calories),
      totalProteinG: Number(totals.protein.toFixed(1)),
      totalCarbsG: Number(totals.carbs.toFixed(1)),
      totalFatG: Number(totals.fat.toFixed(1)),
      totalFiberG: Number(totals.fiber.toFixed(1)),
      analysisMethod: 'manual',
      items: mealItems
    };

    if (isOnline) {
      try {
        const mealData = {
          mealType,
          logDate,
          logTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          analysisMethod: 'manual',
          items: mealItems.map(item => ({
            foodId: item.foodId,
            loggedQuantity: item.loggedQuantity,
            loggedUnit: item.loggedUnit,
            estimationType: 'verified_db'
          }))
        };
        await apiRequest('/api/meals', {
          method: 'POST',
          body: JSON.stringify(mealData)
        });

        const historyRes = await apiRequest('/api/meals/history');
        const formattedMeals = historyRes.map(m => ({
          id: m.id,
          mealType: m.mealType,
          logDate: m.logDate,
          logTime: m.logTime ? m.logTime.slice(0, 5) : '',
          totalCalories: Math.round(m.totalCalories),
          totalProteinG: m.totalProteinG,
          totalCarbsG: m.totalCarbsG,
          totalFatG: m.totalFatG,
          totalFiberG: m.totalFiberG,
          analysisMethod: m.analysisMethod,
          imageUrl: m.imageUrl,
          items: m.MealItems ? m.MealItems.map(item => ({
            foodName: item.Food ? item.Food.name : item.foodName,
            loggedQuantity: item.loggedQuantity,
            loggedUnit: item.loggedUnit,
            calories: Math.round(item.calories)
          })) : []
        }));
        saveMeals(formattedMeals);
        setActiveTab('dashboard');
        return;
      } catch (err) {
        console.error("Failed to save meal manually to server:", err);
      }
    }

    saveMeals([newMeal, ...meals]);
    setActiveTab('dashboard');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Select Date & Category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 bg-slate-900/40 border border-slate-800/50 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400">Log Date</span>
          <input 
            type="date" 
            value={logDate} 
            onChange={e => setLogDate(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1 font-semibold text-slate-200 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1 bg-slate-900/40 border border-slate-800/50 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-slate-400">Meal Category</span>
          <select 
            value={mealType} 
            onChange={e => setMealType(e.target.value)}
            className="text-xs bg-slate-950 border border-slate-800 rounded px-2 py-1 font-semibold text-slate-200 outline-none"
          >
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
          </select>
        </div>
      </div>

      {/* Active meal compiler list */}
      {mealItems.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Meal Components</h3>
          <div className="flex flex-col gap-2">
            {mealItems.map((item, idx) => (
              <div key={idx} className="glass-panel rounded-xl p-3 flex items-center justify-between border border-slate-800/50">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-200">{item.foodName}</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{item.loggedQuantity} {item.loggedUnit} ({item.normalizedGrams}g)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300">{item.calories} kcal</span>
                  <button onClick={() => handleRemoveMealItem(idx)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleLogMeal}
            className="w-full py-2.5 mt-2 bg-emerald-600 hover:bg-emerald-500 transition-colors text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-600/10"
          >
            Log Complete Meal
          </button>
        </div>
      )}

      {/* Dynamic Food database search panel */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Ingredients</h3>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search e.g. Roti, rice..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs"
          />
          <Search size={16} className="absolute left-3 top-3.5 text-slate-500" />
        </div>

        {/* Search Results list dropdown */}
        {searchResults.length > 0 && !selectedFood && (
          <div className="glass-panel border border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-52 overflow-y-auto">
            {searchResults.map(food => (
              <button 
                key={food.id}
                onClick={() => handleSelectFood(food)}
                className="px-4 py-3 text-left hover:bg-slate-800/40 border-b border-slate-800/40 flex items-center justify-between text-xs transition-all"
              >
                <div>
                  <p className="font-bold text-slate-200">{food.name}</p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{food.regionalName}</p>
                </div>
                <ChevronRight size={14} className="text-slate-600" />
              </button>
            ))}
          </div>
        )}

        {/* Add food overlay modal */}
        {selectedFood && (
          <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4 border border-slate-700/40">
            <div>
              <h4 className="text-sm font-extrabold text-slate-200">{selectedFood.name}</h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{selectedFood.regionalName} • {selectedFood.caloriesPer100g} kcal/100g</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold">Quantity</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  value={loggedQuantity}
                  onChange={e => setLoggedQuantity(Math.max(0.1, Number(e.target.value)))}
                  className="w-full mt-1 glass-input py-1.5 text-center text-xs font-bold rounded-lg"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold">Serving Unit</label>
                <select 
                  value={loggedUnit}
                  onChange={e => setLoggedUnit(e.target.value)}
                  className="w-full mt-1 glass-input py-1.5 px-2 text-center text-xs font-semibold rounded-lg outline-none"
                >
                  <option value={selectedFood.servingUnitDefault}>{selectedFood.servingUnitDefault}</option>
                  <option value="g">grams (g)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/50 mt-1">
              <span>Approx total:</span>
              <span>{Math.round(selectedFood.caloriesPer100g * ((loggedQuantity * selectedFood.conversionToGrams) / 100))} kcal</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <button 
                onClick={() => setSelectedFood(null)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddFoodToMeal}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-bold rounded-lg"
              >
                Add to Meal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 4. MEAL HISTORY LOG COMPONENT (Date-Wise Activity Logs & Meal Inspector)
// ---------------------------------------------------------------------
function History({ meals, profile, saveMeals, isOnline, setActiveTab }) {
  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [activePhotoModal, setActivePhotoModal] = useState(null);

  // Compute available unique dates for date selector
  const availableDates = useMemo(() => {
    const dateSet = new Set(meals.map(m => m.logDate));
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() - i * 86400000);
      dateSet.add(getLocalDateString(d));
    }
    return Array.from(dateSet).sort().reverse();
  }, [meals]);

  // Selected Date Meals & Calculations
  const selectedDateMeals = meals.filter(m => m.logDate === selectedDate);
  const selectedTotals = selectedDateMeals.reduce((acc, m) => {
    acc.calories += m.totalCalories || 0;
    acc.protein += m.totalProteinG || 0;
    acc.carbs += m.totalCarbsG || 0;
    acc.fat += m.totalFatG || 0;
    acc.fiber += m.totalFiberG || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  Object.keys(selectedTotals).forEach(k => selectedTotals[k] = Math.round(selectedTotals[k]));
  const photosOnDate = selectedDateMeals.filter(m => m.imageUrl);

  const handleDeleteMeal = async (id) => {
    if (isOnline) {
      try {
        await apiRequest(`/api/meals/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error("Failed to delete meal from backend:", err);
      }
    }
    saveMeals(meals.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-slate-100 text-sm font-extrabold uppercase tracking-wider flex items-center gap-2">
          <HistoryIcon size={16} className="text-indigo-400" />
          Meal Logs & Date-Wise History
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Select any date to view all consumed meals, nutrient comparison & plate photos.
        </p>
      </div>

      {/* DATE-WISE ACTIVITY LOGS SELECTOR BLOCK (as requested) */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={14} className="text-indigo-400" />
              Date-Wise Activity Logs
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Click a date to view consumed vs target nutrients & photos
            </p>
          </div>

          {/* Jump to Date Picker */}
          <div className="relative">
            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 hover:border-indigo-500/50 text-slate-300 text-[11px] font-bold cursor-pointer transition-all">
              <Calendar size={13} className="text-indigo-400" />
              <span>Pick Date</span>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={e => e.target.value && setSelectedDate(e.target.value)} 
                className="opacity-0 absolute inset-0 cursor-pointer w-full"
              />
            </label>
          </div>
        </div>

        {/* Date Selector Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
          {availableDates.map(dateStr => {
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            const dayMeals = meals.filter(m => m.logDate === dateStr);
            const hasPhotos = dayMeals.some(m => m.imageUrl);
            const totalCals = dayMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center min-w-[78px] py-2 px-2.5 rounded-xl transition-all border shrink-0 text-center cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 scale-102' 
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-black">
                    {formatHumanDate(dateStr)}
                  </span>
                  {hasPhotos && (
                    <span title="Plate photos uploaded" className={`text-[9px] ${isSelected ? 'text-white' : 'text-indigo-400'}`}>
                      📷
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-semibold mt-0.5 ${
                  isSelected ? 'text-indigo-100' : 'text-slate-400'
                }`}>
                  {dayMeals.length > 0 ? `${Math.round(totalCals)} kcal` : 'No logs'}
                </span>
                {isToday && (
                  <span className={`text-[8px] font-bold mt-1 px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    Live
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Notice & Quick Reset */}
        {selectedDate !== todayStr && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs">
            <span className="text-[11px] text-indigo-300 font-semibold">
              Viewing logs for: <strong>{formatFullDate(selectedDate)}</strong>
            </span>
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
            >
              Return to Today
            </button>
          </div>
        )}
      </div>

      {/* ALL MEALS CONSUMED ON THAT DATE (as requested: "if we select any date it should give like what are all the meal we have consumed on that date") */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-indigo-400" />
              Meals Consumed on {formatHumanDate(selectedDate)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {selectedDateMeals.length} {selectedDateMeals.length === 1 ? 'meal' : 'meals'} recorded on {selectedDate}
            </p>
          </div>
          
          <span className="text-xs font-black text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
            {selectedTotals.calories} kcal total
          </span>
        </div>

        {/* Detailed Meals List on that Date */}
        {selectedDateMeals.length > 0 ? (
          <div className="flex flex-col gap-3">
            {selectedDateMeals.map(meal => (
              <div key={meal.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col gap-3 hover:border-slate-700 transition-all shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {meal.imageUrl ? (
                      <div 
                        onClick={() => setActivePhotoModal(meal)}
                        className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0 cursor-pointer hover:opacity-80 transition-opacity relative group"
                      >
                        <img src={meal.imageUrl} alt="meal thumbnail" className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity">
                          View
                        </span>
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg font-bold shrink-0">
                        🍽️
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-100">{meal.mealType}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <Clock size={11} />
                        <span>{meal.logTime || 'Logged'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className={meal.analysisMethod === 'image' ? 'text-indigo-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                          {meal.analysisMethod === 'image' ? 'AI Photo Scan' : 'Manual Entry'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-100 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {meal.totalCalories} kcal
                    </span>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      title="Delete this meal"
                      className="text-slate-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Items in meal */}
                {meal.items && meal.items.length > 0 && (
                  <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-indigo-500/40 text-[11px] bg-slate-950/40 p-2.5 rounded-r-lg">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consumed Ingredients:</span>
                    {meal.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-slate-300">
                        <span className="text-slate-300 truncate max-w-[220px]">
                          • {item.foodName} <span className="text-[10px] text-slate-500 font-semibold">x{item.loggedQuantity} {item.loggedUnit || ''}</span>
                        </span>
                        <span className="font-semibold text-slate-300 text-[10px] shrink-0 font-mono">
                          {item.calories} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Macros pill */}
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-800/40 pt-2">
                  <span className="text-emerald-400">Protein: {meal.totalProteinG}g</span>
                  <span className="text-amber-400">Carbs: {meal.totalCarbsG}g</span>
                  <span className="text-rose-400">Fat: {meal.totalFatG}g</span>
                  {meal.totalFiberG !== undefined && <span className="text-teal-400">Fiber: {meal.totalFiberG}g</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center flex flex-col items-center justify-center">
            <Calendar size={32} className="text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-300">No meals logged on {formatHumanDate(selectedDate)}</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[240px]">
              You haven't recorded any meals or uploaded photos for this date.
            </p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setActiveTab('camera')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 shadow cursor-pointer"
              >
                <Camera size={13} />
                Scan Plate
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                Log Food
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TWO-COLUMN SIDE-BY-SIDE COMPARATIVE NUTRIENTS TABLE FOR SELECTED DATE */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Scale size={14} className="text-indigo-400" />
              Nutrient Comparison ({formatHumanDate(selectedDate)})
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Side-by-side: Actually consumed nutrients vs recommended target
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            selectedDate === todayStr 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          }`}>
            {selectedDate === todayStr ? 'Live Today' : selectedDate}
          </span>
        </div>

        {/* Two Column Table Headers */}
        <div className="grid grid-cols-2 gap-3 pb-1 border-b border-slate-800/40 text-[11px] font-bold uppercase tracking-wider">
          <div className="text-indigo-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            Actually Consumed
          </div>
          <div className="text-slate-400 flex items-center gap-1.5 text-right justify-end">
            Should Be Consumed
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
          </div>
        </div>

        {/* Comparison Rows */}
        <div className="flex flex-col gap-3">
          <NutrientComparisonRow
            name="Total Energy / Calories"
            consumed={selectedTotals.calories}
            target={profile.dailyCalorieTarget}
            unit="kcal"
            barColor="bg-indigo-500"
          />

          <NutrientComparisonRow
            name="Protein Intake"
            consumed={selectedTotals.protein}
            target={profile.dailyProteinTargetG}
            unit="g"
            barColor="bg-emerald-500"
          />

          <NutrientComparisonRow
            name="Carbohydrates"
            consumed={selectedTotals.carbs}
            target={profile.dailyCarbsTargetG}
            unit="g"
            barColor="bg-amber-500"
          />

          <NutrientComparisonRow
            name="Total Dietary Fats"
            consumed={selectedTotals.fat}
            target={profile.dailyFatTargetG}
            unit="g"
            barColor="bg-rose-500"
          />

          <NutrientComparisonRow
            name="Dietary Fiber"
            consumed={selectedTotals.fiber}
            target={profile.dailyFiberTargetG}
            unit="g"
            barColor="bg-teal-500"
          />
        </div>
      </div>

      {/* UPLOADED PHOTOS FOR SELECTED DATE */}
      {photosOnDate.length > 0 && (
        <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-xl flex flex-col gap-3">
          <p className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
            <ImageIcon size={14} />
            Photos Uploaded on {formatHumanDate(selectedDate)} ({photosOnDate.length})
          </p>
          <div className="grid grid-cols-2 gap-3">
            {photosOnDate.map((meal, idx) => (
              <div 
                key={idx}
                onClick={() => setActivePhotoModal(meal)}
                className="group relative rounded-xl overflow-hidden border border-slate-800/80 aspect-video bg-slate-900 cursor-pointer shadow-md hover:border-indigo-500/50 transition-all"
              >
                <img src={meal.imageUrl} alt={meal.mealType} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-slate-950/80 text-white border border-slate-800">
                    {meal.mealType}
                  </span>
                  <span className="text-indigo-300 font-extrabold bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                    {meal.totalCalories} kcal
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-950/50 transition-opacity">
                  <span className="text-[11px] font-bold text-white bg-indigo-600/90 px-2.5 py-1 rounded-lg shadow">
                    View Plate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {activePhotoModal && (
        <PhotoModal activePhotoModal={activePhotoModal} onClose={() => setActivePhotoModal(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// 5. PROFILE & TARGETS CALCULATOR
// ---------------------------------------------------------------------
function Profile({ profile, saveProfileSettings, isOnline, currentUser, onLogout }) {
  const [age, setAge] = useState(profile.age || 26);
  const [heightCm, setHeightCm] = useState(profile.heightCm || 172);
  const [weightKg, setWeightKg] = useState(profile.weightKg || 68);
  const [activityLevel, setActivityLevel] = useState(profile.activityLevel || 'moderately_active');
  const [fitnessGoal, setFitnessGoal] = useState(profile.fitnessGoal || 'maintain_weight');
  const [dietaryPreference, setDietaryPreference] = useState(profile.dietaryPreference || 'omnivore');
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Sync state when profile prop changes on user switch
  useEffect(() => {
    if (profile) {
      setAge(profile.age || 26);
      setHeightCm(profile.heightCm || 172);
      setWeightKg(profile.weightKg || 68);
      setActivityLevel(profile.activityLevel || 'moderately_active');
      setFitnessGoal(profile.fitnessGoal || 'maintain_weight');
      setDietaryPreference(profile.dietaryPreference || 'omnivore');
    }
  }, [profile]);

  const handleRecalculateTargets = async (e) => {
    e.preventDefault();

    // Harris-Benedict Dynamic calculations
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5; 
    
    let multiplier = 1.2;
    if (activityLevel === 'lightly_active') multiplier = 1.375;
    if (activityLevel === 'moderately_active') multiplier = 1.55;
    if (activityLevel === 'very_active') multiplier = 1.725;

    let dailyCalorieTarget = Math.round(bmr * multiplier);
    if (fitnessGoal === 'lose_weight') dailyCalorieTarget -= 500;
    if (fitnessGoal === 'gain_weight') dailyCalorieTarget += 500;

    const dailyProteinTargetG = Math.round((dailyCalorieTarget * 0.20) / 4);
    const dailyCarbsTargetG = Math.round((dailyCalorieTarget * 0.50) / 4);
    const dailyFatTargetG = Math.round((dailyCalorieTarget * 0.30) / 9);
    const dailyFiberTargetG = Math.round((dailyCalorieTarget / 1000) * 14);

    const updated = {
      isCompleted: true,
      age,
      heightCm,
      weightKg,
      activityLevel,
      fitnessGoal,
      dietaryPreference,
      dailyCalorieTarget,
      dailyProteinTargetG,
      dailyCarbsTargetG,
      dailyFatTargetG,
      dailyFiberTargetG
    };

    if (isOnline) {
      try {
        await apiRequest('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updated)
        });
      } catch (err) {
        console.error("Failed to save profile targets to server:", err);
      }
    }

    saveProfileSettings(updated);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Individual Account Card */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-600/30">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-100">{currentUser?.name || 'Individual Profile'}</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-xs text-slate-400 font-medium">{currentUser?.email}</p>
              <div className="flex items-center gap-1 mt-1 text-[9px] font-semibold text-indigo-400">
                <ShieldCheck size={11} />
                <span>Isolated Individual Account</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Sign out or switch to another user"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 transition-all text-xs font-bold cursor-pointer"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleRecalculateTargets} className="flex flex-col gap-5">
        <h2 className="text-slate-300 text-xs font-bold uppercase tracking-wider">Nutrition & Health Metrics</h2>

        {showSavedToast && (
          <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={14} />
            Individual targets successfully updated and saved!
          </div>
        )}

      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4 border border-slate-800/60">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 font-semibold">Age (years)</label>
            <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="w-full mt-1 glass-input py-1.5 text-center text-xs font-bold rounded-lg" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-semibold">Height (cm)</label>
            <input type="number" value={heightCm} onChange={e => setHeightCm(Number(e.target.value))} className="w-full mt-1 glass-input py-1.5 text-center text-xs font-bold rounded-lg" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 font-semibold">Weight (kg)</label>
            <input type="number" value={weightKg} onChange={e => setWeightKg(Number(e.target.value))} className="w-full mt-1 glass-input py-1.5 text-center text-xs font-bold rounded-lg" />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-semibold">Activity Level</label>
          <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)} className="w-full mt-1 glass-input py-2 px-3 text-xs font-semibold rounded-lg outline-none">
            <option value="sedentary">Sedentary (Little or no exercise)</option>
            <option value="lightly_active">Lightly Active (1-3 days/week)</option>
            <option value="moderately_active">Moderately Active (3-5 days/week)</option>
            <option value="very_active">Very Active (6-7 days/week)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-semibold">Fitness Goal</label>
          <select value={fitnessGoal} onChange={e => setFitnessGoal(e.target.value)} className="w-full mt-1 glass-input py-2 px-3 text-xs font-semibold rounded-lg outline-none">
            <option value="lose_weight">Lose weight (-500 kcal deficit)</option>
            <option value="maintain_weight">Maintain weight</option>
            <option value="gain_weight">Gain weight (+500 kcal surplus)</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 font-semibold">Dietary Preference</label>
          <select value={dietaryPreference} onChange={e => setDietaryPreference(e.target.value)} className="w-full mt-1 glass-input py-2 px-3 text-xs font-semibold rounded-lg outline-none">
            <option value="omnivore">Omnivore</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="eggitarian">Eggitarian</option>
          </select>
        </div>
      </div>

      {/* Target results visualization */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3.5 border border-slate-800/60">
        <h3 className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-0.5">Calculated Daily Targets</h3>
        
        <div className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-2.5">
          <span className="text-slate-400">Daily Calories Target:</span>
          <span className="font-bold text-slate-100">{profile.dailyCalorieTarget} kcal</span>
        </div>
        <div className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-2.5">
          <span className="text-slate-400">Protein Target:</span>
          <span className="font-bold text-emerald-400">{profile.dailyProteinTargetG}g</span>
        </div>
        <div className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-2.5">
          <span className="text-slate-400">Carbs Target:</span>
          <span className="font-bold text-amber-400">{profile.dailyCarbsTargetG}g</span>
        </div>
        <div className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-2.5">
          <span className="text-slate-400">Fat Target:</span>
          <span className="font-bold text-rose-400">{profile.dailyFatTargetG}g</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Dietary Fiber Target:</span>
          <span className="font-bold text-teal-400">{profile.dailyFiberTargetG}g</span>
        </div>
      </div>

      <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10">
        Recalculate & Save Targets
      </button>
      
      <p className="text-[10px] text-center text-slate-500 px-6 font-medium mt-1 leading-normal">
        Disclaimer: Calculated values are estimates based on standard formulaic heuristics and do not replace professional medical advice.
      </p>
      </form>
    </div>
  );
}
