export type AchievementType = 'streak' | 'milestone' | 'consistency' | 'completion';

export interface Streak {
  days: number;
  // a simple numeric representation for the sake of MVP
  current: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
}

export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  badge?: Badge;
  streak?: Streak;
  achievedAt?: string; // ISO date
}
