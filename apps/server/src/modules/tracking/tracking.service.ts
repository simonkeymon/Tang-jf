export type MealCheckinStatus = 'completed' | 'skipped' | 'partial';
export type MealCheckinType = '早餐' | '午餐' | '晚餐' | '加餐';

export interface WeightRecord {
  user_id: string;
  date: string;
  weight_kg: number;
  note?: string;
}

export interface MealCheckinRecord {
  user_id: string;
  date: string;
  meal_type: MealCheckinType;
  status: MealCheckinStatus;
}

export interface TrackingService {
  upsertWeight(userId: string, input: Omit<WeightRecord, 'user_id'>): WeightRecord;
  listWeights(userId: string, from?: string, to?: string): WeightRecord[];
  getWeightForDate(userId: string, date: string): WeightRecord | null;
  upsertCheckin(userId: string, input: Omit<MealCheckinRecord, 'user_id'>): MealCheckinRecord;
  getTodayCheckins(userId: string): MealCheckinRecord[];
  getCheckinsForDate(userId: string, date: string): MealCheckinRecord[];
  getStreak(userId: string): number;
}

export function createTrackingService(): TrackingService {
  const weightEntries = new Map<string, WeightRecord[]>();
  const checkins = new Map<string, MealCheckinRecord[]>();

  return {
    upsertWeight(userId, input) {
      const existing = weightEntries.get(userId) ?? [];
      const nextEntry: WeightRecord = { user_id: userId, ...input };
      const updated = existing.filter((entry) => entry.date !== input.date);
      updated.push(nextEntry);
      updated.sort((a, b) => a.date.localeCompare(b.date));
      weightEntries.set(userId, updated);
      return nextEntry;
    },

    listWeights(userId, from, to) {
      return (weightEntries.get(userId) ?? []).filter((entry) => {
        if (from && entry.date < from) return false;
        if (to && entry.date > to) return false;
        return true;
      });
    },

    getWeightForDate(userId, date) {
      return (weightEntries.get(userId) ?? []).find((entry) => entry.date === date) ?? null;
    },

    upsertCheckin(userId, input) {
      const existing = checkins.get(userId) ?? [];
      const nextEntry: MealCheckinRecord = { user_id: userId, ...input };
      const updated = existing.filter(
        (entry) => !(entry.date === input.date && entry.meal_type === input.meal_type),
      );
      updated.push(nextEntry);
      updated.sort(
        (a, b) => a.date.localeCompare(b.date) || a.meal_type.localeCompare(b.meal_type),
      );
      checkins.set(userId, updated);
      return nextEntry;
    },

    getTodayCheckins(userId) {
      const today = new Date().toISOString().slice(0, 10);
      return (checkins.get(userId) ?? []).filter((entry) => entry.date === today);
    },

    getCheckinsForDate(userId, date) {
      return (checkins.get(userId) ?? []).filter((entry) => entry.date === date);
    },

    getStreak(userId) {
      const allCheckins = checkins.get(userId) ?? [];
      const grouped = new Map<string, MealCheckinRecord[]>();

      for (const entry of allCheckins) {
        const current = grouped.get(entry.date) ?? [];
        current.push(entry);
        grouped.set(entry.date, current);
      }

      const qualifyingDates = [...grouped.entries()]
        .filter(
          ([, entries]) => entries.filter((entry) => entry.status === 'completed').length >= 2,
        )
        .map(([date]) => date)
        .sort();

      if (qualifyingDates.length === 0) {
        return 0;
      }

      let streak = 1;
      for (let index = qualifyingDates.length - 1; index > 0; index -= 1) {
        const current = new Date(`${qualifyingDates[index]}T00:00:00Z`);
        const previous = new Date(`${qualifyingDates[index - 1]}T00:00:00Z`);
        const diffDays = Math.round(
          (current.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000),
        );

        if (diffDays === 1) {
          streak += 1;
        } else {
          break;
        }
      }

      return streak;
    },
  };
}
