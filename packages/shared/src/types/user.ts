// User-related domain types
export type Gender = 'male' | 'female' | 'other' | 'unspecified';

export type UserGoal =
  | 'weight_loss'
  | 'weight_gain'
  | 'maintenance'
  | 'muscle_gain'
  | 'general_health';

export type DietaryRestriction =
  | 'vegan'
  | 'vegetarian'
  | 'gluten_free'
  | 'lactose_intolerant'
  | 'pescatarian'
  | 'none';

export interface UserProfile {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  gender?: Gender;
  birthYear?: number;
  age?: number; // explicit age for convenience when birthYear unavailable
  heightCm?: number;
  height_cm?: number;
  weightKg?: number;
  weight_kg?: number;
  primaryGoal?: UserGoal;
  goals?: UserGoal[];
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete';
  allergies?: string[];
  dietaryRestrictions?: DietaryRestriction[];
}

export interface User {
  id: string;
  email: string;
  profile?: UserProfile;
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}
