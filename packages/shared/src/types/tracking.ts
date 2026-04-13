export interface WeightEntry {
  date: string; // ISO date
  weightKg: number;
  note?: string;
}

export type CheckInStatus = 'scheduled' | 'completed' | 'missed';

export interface MealCheckIn {
  date: string; // ISO date
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  checked?: boolean;
  status?: CheckInStatus;
}
