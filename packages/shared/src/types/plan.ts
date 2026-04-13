// Meal type representations: Chinese labels for MVP surface, with English equivalents as a separate label type
export type MealType = '早餐' | '午餐' | '晚餐' | '加餐' | '其他';
export type MealTypeLabel = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';

export type PlanStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface DietMacro {
  protein: number; // grams
  carbohydrate: number; // grams
  fat: number; // grams
  calories?: number;
}

export interface DailyPlan {
  date: string; // ISO date
  meals: { type: MealType; label?: MealTypeLabel; plan: string; macro?: DietMacro }[];
  notes?: string;
}

export interface DietPlan {
  id: string;
  userId: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date
  dailyPlans?: DailyPlan[];
  macroTarget?: DietMacro;
  status?: PlanStatus;
}
