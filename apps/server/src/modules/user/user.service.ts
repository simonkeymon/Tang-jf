import { eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { profiles } from '../../db/schema/index.js';
import type { PatchProfileInput, ProfileInput } from './user.validator.js';

export interface StoredProfile {
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  goal: string;
  activity_level: string;
  dietary_restrictions: string[];
  allergies: string[];
}

export interface ProfileResponse extends StoredProfile {
  bmr: number;
  tdee: number;
  daily_calorie_target: number;
}

export interface UserService {
  getProfile(userId: string): ProfileResponse | null;
  putProfile(userId: string, input: ProfileInput): ProfileResponse;
  patchProfile(userId: string, input: PatchProfileInput): ProfileResponse | null;
  updateAllergies(userId: string, allergies: string[]): ProfileResponse | null;
  updateRestrictions(userId: string, dietary_restrictions: string[]): ProfileResponse | null;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const GOAL_CALORIE_OFFSETS: Record<string, number> = {
  lose: -500,
  maintain: 0,
  gain: 500,
};

function calculateBmr(profile: StoredProfile): number {
  const base = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age;
  return Math.round(profile.gender === 'male' ? base + 5 : base - 161);
}

function calculateTdee(bmr: number, activityLevel: string): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

function calculateDailyCalorieTarget(tdee: number, goal: string): number {
  const offset = GOAL_CALORIE_OFFSETS[goal] ?? 0;
  return Math.round(tdee + offset);
}

function toProfileResponse(profile: StoredProfile): ProfileResponse {
  const bmr = calculateBmr(profile);
  const tdee = calculateTdee(bmr, profile.activity_level);
  const daily_calorie_target = calculateDailyCalorieTarget(tdee, profile.goal);

  return { ...profile, bmr, tdee, daily_calorie_target };
}

export function createUserService(): UserService & { hydrate?(): Promise<void> } {
  const profilesByUser = new Map<string, StoredProfile>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      const records = await db.select().from(profiles);
      profilesByUser.clear();
      for (const record of records) {
        profilesByUser.set(record.user_id, mapProfileRecord(record));
      }
    },

    getProfile(userId) {
      const profile = profilesByUser.get(userId);
      if (!profile) return null;
      return toProfileResponse(profile);
    },

    putProfile(userId, input) {
      const profile: StoredProfile = {
        gender: input.gender,
        age: input.age,
        height_cm: input.height_cm,
        weight_kg: input.weight_kg,
        goal: input.goal,
        activity_level: input.activity_level,
        dietary_restrictions: input.dietary_restrictions ?? [],
        allergies: input.allergies ?? [],
      };

      profilesByUser.set(userId, profile);
      persistProfile(userId, profile);
      return toProfileResponse(profile);
    },

    patchProfile(userId, input) {
      const existing = profilesByUser.get(userId);
      if (!existing) return null;

      const updated: StoredProfile = { ...existing, ...input };
      profilesByUser.set(userId, updated);
      persistProfile(userId, updated);
      return toProfileResponse(updated);
    },

    updateAllergies(userId, allergies) {
      const existing = profilesByUser.get(userId);
      if (!existing) return null;

      const updated: StoredProfile = { ...existing, allergies };
      profilesByUser.set(userId, updated);
      persistProfile(userId, updated);
      return toProfileResponse(updated);
    },

    updateRestrictions(userId, dietary_restrictions) {
      const existing = profilesByUser.get(userId);
      if (!existing) return null;

      const updated: StoredProfile = { ...existing, dietary_restrictions };
      profilesByUser.set(userId, updated);
      persistProfile(userId, updated);
      return toProfileResponse(updated);
    },
  };
}

function mapProfileRecord(record: typeof profiles.$inferSelect): StoredProfile {
  return {
    gender: record.gender,
    age: record.age,
    height_cm: record.height_cm,
    weight_kg: record.weight_kg,
    goal: record.goal,
    activity_level: record.activity_level,
    dietary_restrictions: (record.dietary_restrictions as string[]) ?? [],
    allergies: (record.allergies as string[]) ?? [],
  };
}

function persistProfile(userId: string, profile: StoredProfile) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db.delete(profiles).where(eq(profiles.user_id, userId));
    await db.insert(profiles).values({
      user_id: userId,
      gender: profile.gender,
      age: profile.age,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      goal: profile.goal,
      activity_level: profile.activity_level,
      dietary_restrictions: profile.dietary_restrictions,
      allergies: profile.allergies,
    });
  })();
}
