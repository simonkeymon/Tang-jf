export interface NutritionSummary {
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface WeeklyReport {
  weekStarting: string; // ISO date
  caloriesTotal: number;
  nutrition?: NutritionSummary;
}

export interface MonthlyReport {
  month: string; // e.g., '2026-04'
  totalCalories: number;
  nutrition?: NutritionSummary;
}
