import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { meal_check_ins, weight_entries } from '../../db/schema/index.js';

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

export function createTrackingService(): TrackingService & { hydrate?(): Promise<void> } {
  const weightByUser = new Map<string, WeightRecord[]>();
  const checkinsByUser = new Map<string, MealCheckinRecord[]>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      weightByUser.clear();
      checkinsByUser.clear();

      const [weightRecords, mealRecords] = await Promise.all([
        db.select().from(weight_entries),
        db.select().from(meal_check_ins),
      ]);

      for (const record of weightRecords) {
        const current = weightByUser.get(record.user_id) ?? [];
        current.push({
          user_id: record.user_id,
          date: record.date,
          weight_kg: Number(record.weight_kg),
          note: record.note ?? undefined,
        });
        current.sort((a, b) => a.date.localeCompare(b.date));
        weightByUser.set(record.user_id, current);
      }

      for (const record of mealRecords) {
        const current = checkinsByUser.get(record.user_id) ?? [];
        current.push({
          user_id: record.user_id,
          date: record.date,
          meal_type: record.meal_type as MealCheckinType,
          status: record.status as MealCheckinStatus,
        });
        current.sort(
          (a, b) => a.date.localeCompare(b.date) || a.meal_type.localeCompare(b.meal_type),
        );
        checkinsByUser.set(record.user_id, current);
      }
    },

    upsertWeight(userId, input) {
      const existing = weightByUser.get(userId) ?? [];
      const nextEntry: WeightRecord = { user_id: userId, ...input };
      const updated = existing.filter((entry) => entry.date !== input.date);
      updated.push(nextEntry);
      updated.sort((a, b) => a.date.localeCompare(b.date));
      weightByUser.set(userId, updated);
      persistWeight(nextEntry);
      return nextEntry;
    },

    listWeights(userId, from, to) {
      return (weightByUser.get(userId) ?? []).filter((entry) => {
        if (from && entry.date < from) return false;
        if (to && entry.date > to) return false;
        return true;
      });
    },

    getWeightForDate(userId, date) {
      return (weightByUser.get(userId) ?? []).find((entry) => entry.date === date) ?? null;
    },

    upsertCheckin(userId, input) {
      const existing = checkinsByUser.get(userId) ?? [];
      const nextEntry: MealCheckinRecord = { user_id: userId, ...input };
      const updated = existing.filter(
        (entry) => !(entry.date === input.date && entry.meal_type === input.meal_type),
      );
      updated.push(nextEntry);
      updated.sort(
        (a, b) => a.date.localeCompare(b.date) || a.meal_type.localeCompare(b.meal_type),
      );
      checkinsByUser.set(userId, updated);
      persistCheckin(nextEntry);
      return nextEntry;
    },

    getTodayCheckins(userId) {
      const today = new Date().toISOString().slice(0, 10);
      return (checkinsByUser.get(userId) ?? []).filter((entry) => entry.date === today);
    },

    getCheckinsForDate(userId, date) {
      return (checkinsByUser.get(userId) ?? []).filter((entry) => entry.date === date);
    },

    getStreak(userId) {
      const allCheckins = checkinsByUser.get(userId) ?? [];
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

function persistWeight(entry: WeightRecord) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db
      .delete(weight_entries)
      .where(and(eq(weight_entries.user_id, entry.user_id), eq(weight_entries.date, entry.date)));
    await db.insert(weight_entries).values({
      id: randomUUID(),
      user_id: entry.user_id,
      date: entry.date,
      weight_kg: entry.weight_kg,
      note: entry.note,
    });
  })();
}

function persistCheckin(entry: MealCheckinRecord) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db
      .delete(meal_check_ins)
      .where(
        and(
          eq(meal_check_ins.user_id, entry.user_id),
          eq(meal_check_ins.date, entry.date),
          eq(meal_check_ins.meal_type, entry.meal_type),
        ),
      );
    await db.insert(meal_check_ins).values({
      id: randomUUID(),
      user_id: entry.user_id,
      date: entry.date,
      meal_type: entry.meal_type,
      status: entry.status,
    });
  })();
}
