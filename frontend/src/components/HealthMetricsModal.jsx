import React, { useState } from 'react';
import { 
  Sparkles, 
  Scale, 
  Activity, 
  Target, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function HealthMetricsModal({ profile, currentUser, onSaveMetrics, isOnline }) {
  const [age, setAge] = useState(profile?.age || 26);
  const [heightCm, setHeightCm] = useState(profile?.heightCm || 172);
  const [weightKg, setWeightKg] = useState(profile?.weightKg || 68);
  const [activityLevel, setActivityLevel] = useState(profile?.activityLevel || 'moderately_active');
  const [fitnessGoal, setFitnessGoal] = useState(profile?.fitnessGoal || 'maintain_weight');
  const [dietaryPreference, setDietaryPreference] = useState(profile?.dietaryPreference || 'omnivore');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Live real-time target calculations using Harris-Benedict formulas
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5; 
  let multiplier = 1.2;
  if (activityLevel === 'lightly_active') multiplier = 1.375;
  if (activityLevel === 'moderately_active') multiplier = 1.55;
  if (activityLevel === 'very_active') multiplier = 1.725;

  let computedCalories = Math.round(bmr * multiplier);
  if (fitnessGoal === 'lose_weight') computedCalories -= 500;
  if (fitnessGoal === 'gain_weight') computedCalories += 500;

  const computedProtein = Math.round((computedCalories * 0.20) / 4);
  const computedCarbs = Math.round((computedCalories * 0.50) / 4);
  const computedFat = Math.round((computedCalories * 0.30) / 9);
  const computedFiber = Math.round((computedCalories / 1000) * 14);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (age <= 0 || age > 120) {
      setErrorMsg('Please enter a valid age');
      return;
    }
    if (heightCm <= 50 || heightCm > 280) {
      setErrorMsg('Please enter a valid height in cm');
      return;
    }
    if (weightKg <= 20 || weightKg > 350) {
      setErrorMsg('Please enter a valid weight in kg');
      return;
    }

    setIsSubmitting(true);

    const updatedProfile = {
      isCompleted: true,
      age: Number(age),
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activityLevel,
      fitnessGoal,
      dietaryPreference,
      dailyCalorieTarget: computedCalories,
      dailyProteinTargetG: computedProtein,
      dailyCarbsTargetG: computedCarbs,
      dailyFatTargetG: computedFat,
      dailyFiberTargetG: computedFiber
    };

    try {
      await onSaveMetrics(updatedProfile);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save health metrics. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="glass-panel max-w-md w-full rounded-2xl p-6 border border-indigo-500/40 shadow-2xl bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-950/95 flex flex-col gap-5 my-auto">
        {/* Header Alert Notification */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/20">
              <Scale size={26} className="text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] shadow">
              <Sparkles size={11} />
            </span>
          </div>

          <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 mb-1 flex items-center gap-1">
            <ShieldAlert size={12} />
            Action Required • Complete Profile First
          </span>

          <h2 className="text-base font-extrabold text-slate-100 font-display">
            Nutrition & Health Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
            Welcome, <strong className="text-slate-200">{currentUser?.name || 'there'}</strong>! Please complete your body metrics to calibrate your personalized daily calorie and macronutrient targets.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 3-Column Body Measurements */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
                Age (years)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={age}
                onChange={(e) => setAge(Math.max(1, Number(e.target.value)))}
                className="w-full glass-input py-2 text-center text-xs font-bold rounded-xl text-slate-100"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
                Height (cm)
              </label>
              <input
                type="number"
                min="50"
                max="280"
                value={heightCm}
                onChange={(e) => setHeightCm(Math.max(1, Number(e.target.value)))}
                className="w-full glass-input py-2 text-center text-xs font-bold rounded-xl text-slate-100"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
                Weight (kg)
              </label>
              <input
                type="number"
                min="20"
                max="350"
                value={weightKg}
                onChange={(e) => setWeightKg(Math.max(1, Number(e.target.value)))}
                className="w-full glass-input py-2 text-center text-xs font-bold rounded-xl text-slate-100"
                required
              />
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
              Physical Activity Level
            </label>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="w-full glass-input py-2 px-3 text-xs font-semibold rounded-xl text-slate-200 outline-none"
            >
              <option value="sedentary">Sedentary (Little or no exercise)</option>
              <option value="lightly_active">Lightly Active (1-3 workouts / week)</option>
              <option value="moderately_active">Moderately Active (3-5 workouts / week)</option>
              <option value="very_active">Very Active (6-7 intense workouts / week)</option>
            </select>
          </div>

          {/* Fitness Goal */}
          <div>
            <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
              Primary Fitness & Weight Goal
            </label>
            <select
              value={fitnessGoal}
              onChange={(e) => setFitnessGoal(e.target.value)}
              className="w-full glass-input py-2 px-3 text-xs font-semibold rounded-xl text-slate-200 outline-none"
            >
              <option value="lose_weight">Lose Weight (-500 kcal deficit)</option>
              <option value="maintain_weight">Maintain Current Weight</option>
              <option value="gain_weight">Gain Weight / Muscle (+500 kcal surplus)</option>
            </select>
          </div>

          {/* Dietary Preference */}
          <div>
            <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
              Dietary Preference
            </label>
            <select
              value={dietaryPreference}
              onChange={(e) => setDietaryPreference(e.target.value)}
              className="w-full glass-input py-2 px-3 text-xs font-semibold rounded-xl text-slate-200 outline-none"
            >
              <option value="omnivore">Omnivore (Standard diet)</option>
              <option value="vegetarian">Vegetarian (Plant-based & Dairy)</option>
              <option value="vegan">Vegan (100% Plant-based)</option>
              <option value="eggitarian">Eggitarian (Vegetarian + Eggs)</option>
            </select>
          </div>

          {/* Real-time Target Preview Card */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex flex-col gap-2 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <Target size={12} />
                Calculated Daily Target
              </span>
              <span className="text-sm font-black text-slate-100 font-mono">
                {computedCalories} <span className="text-[10px] text-slate-400 font-normal">kcal/day</span>
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 pt-1 text-center text-[10px] font-bold">
              <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Protein</span>
                <span className="text-emerald-400">{computedProtein}g</span>
              </div>
              <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Carbs</span>
                <span className="text-amber-400">{computedCarbs}g</span>
              </div>
              <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Fats</span>
                <span className="text-rose-400">{computedFat}g</span>
              </div>
              <div className="p-1 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[9px] text-slate-400 block">Fiber</span>
                <span className="text-teal-400">{computedFiber}g</span>
              </div>
            </div>
          </div>

          {/* Mandatory Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-1 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 transition-all text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Save & Calibrate My Nutrition Targets</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        <p className="text-[10px] text-center text-slate-500 font-medium">
          Note: This must be completed first to provide accurate personalized nutrition goals.
        </p>
      </div>
    </div>
  );
}
