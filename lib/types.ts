// ─── Database row types ───────────────────────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_calories: number;
  goal_protein: number;
  goal_carbs: number;
  goal_fat: number;
  created_at: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  quantity: number;
  unit: string;
  created_at: string;
}

export type NewFoodLog = Omit<FoodLog, 'id' | 'created_at'>;

export interface WorkoutSession {
  id: string;
  user_id: string;
  date: string;
  split_name: string;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  workout_sets?: WorkoutSet[];
}

export type NewWorkoutSession = Omit<WorkoutSession, 'id' | 'created_at' | 'workout_sets'>;

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_name: string;
  muscle_group: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  duration_sec: number | null;
  created_at: string;
}

export type NewWorkoutSet = Omit<WorkoutSet, 'id' | 'created_at'>;

// ─── UI / domain types ────────────────────────────────────────────────────────

export interface MacroSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyCalories {
  date: string;
  calories: number;
}

export interface ExerciseProgressPoint {
  date: string;
  maxWeight: number;
  totalVolume: number;
}

// ─── Open Food Facts ─────────────────────────────────────────────────────────

export interface OFFProduct {
  id: string;
  product_name: string;
  brands: string;
  energy_kcal_100g: number;
  proteins_100g: number;
  carbohydrates_100g: number;
  fat_100g: number;
  image_small_url?: string;
}

// Alias for convenience
export type OpenFoodFactsProduct = OFFProduct;

// ─── Exercise library ────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  instructions?: string;
}

// ─── Workout splits ───────────────────────────────────────────────────────────

export interface SplitDay {
  name: string;
  muscles: string[];
  exercises: string[];
}

export interface WorkoutSplit {
  id: string;
  name: string;
  shortName: string;
  description: string;
  frequency: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  bestFor: string;
  color: string;
  days: SplitDay[];
}

// ─── Active workout ──────────────────────────────────────────────────────────

export interface BodyWeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  notes: string | null;
  created_at: string;
}

export type NewBodyWeightLog = Omit<BodyWeightLog, 'id' | 'created_at'>;

export interface ActiveSet {
  id: string;
  weight: string;
  reps: string;
  rpe: string;    // 1–10, optional
  done: boolean;
}

export interface ActiveExercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: ActiveSet[];
}
