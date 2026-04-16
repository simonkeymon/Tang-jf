import { randomUUID } from 'node:crypto';

import type { AIChatMessage } from '@tang/shared';
import { desc, eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { plans } from '../../db/schema/index.js';
import type { AIServerService } from '../ai/ai.service.js';
import type { ProfileResponse, UserService } from '../user/user.service.js';
import { buildPlanPrompt } from './plan.prompts.js';

export interface MacroRatio {
  protein: number;
  carbohydrate: number;
  fat: number;
}

export interface DietPlanRecord {
  id: string;
  user_id: string;
  goal: string;
  duration_days: number;
  status: 'active' | 'archived';
  daily_calorie_target: number;
  macro_ratio: MacroRatio;
  phase_descriptions: string[];
  notes: string;
  created_at: string;
}

export interface PlanService {
  generatePlan(userId: string): Promise<DietPlanRecord>;
  getCurrentPlan(userId: string): DietPlanRecord | null;
  getPlan(userId: string, planId: string): DietPlanRecord | null;
  listPlans(userId: string): DietPlanRecord[];
}

export class PlanError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'PlanError';
  }
}

export function createPlanService(
  userService: UserService,
  aiService: AIServerService,
): PlanService & { hydrate?(): Promise<void> } {
  const plansByUser = new Map<string, DietPlanRecord[]>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      const records = await db.select().from(plans).orderBy(desc(plans.created_at));
      plansByUser.clear();

      for (const record of records) {
        const mapped = mapPlanRecord(record);
        const current = plansByUser.get(mapped.user_id) ?? [];
        current.push(mapped);
        plansByUser.set(mapped.user_id, current);
      }
    },

    async generatePlan(userId) {
      const profile = userService.getProfile(userId);
      if (!profile) {
        throw new PlanError(404, 'Profile not found');
      }

      const prompt = buildPlanPrompt({ profile });
      const aiMessages: AIChatMessage[] = [{ role: 'user', content: prompt }];
      const aiResponse = await aiService.chatForUser(userId, aiMessages, {
        mockResponse: `Plan for ${profile.goal}`,
      });

      const plan = buildPlan(profile, aiResponse.content, userId);
      const existingPlans = plansByUser.get(userId) ?? [];
      const archivedPlans = existingPlans.map((existingPlan) => ({
        ...existingPlan,
        status: 'archived' as const,
      }));
      plansByUser.set(userId, [plan, ...archivedPlans]);

      const db = getDb();
      if (db && isDatabaseEnabled()) {
        await db.update(plans).set({ status: 'archived' }).where(eq(plans.user_id, userId));
        await db.insert(plans).values(toPlanInsert(plan));
      }

      return plan;
    },

    getCurrentPlan(userId) {
      return (plansByUser.get(userId) ?? []).find((plan) => plan.status === 'active') ?? null;
    },

    getPlan(userId, planId) {
      return (plansByUser.get(userId) ?? []).find((plan) => plan.id === planId) ?? null;
    },

    listPlans(userId) {
      return plansByUser.get(userId) ?? [];
    },
  };
}

function buildPlan(profile: ProfileResponse, aiSummary: string, userId: string): DietPlanRecord {
  const baseCalories = applySafetyFloor(profile.gender, profile.daily_calorie_target);
  const macro_ratio = getMacroRatio(profile.goal);

  return {
    id: randomUUID(),
    user_id: userId,
    goal: profile.goal,
    duration_days: 30,
    status: 'active',
    daily_calorie_target: baseCalories,
    macro_ratio,
    phase_descriptions: [
      '第1阶段：建立规律饮食节奏',
      '第2阶段：稳定热量控制与营养结构',
      '第3阶段：根据执行情况微调计划',
    ],
    notes: aiSummary,
    created_at: new Date().toISOString(),
  };
}

function applySafetyFloor(gender: string, calories: number): number {
  const floor = gender === 'female' ? 1200 : 1500;
  return Math.max(floor, calories);
}

function getMacroRatio(goal: string): MacroRatio {
  switch (goal) {
    case 'lose':
      return { protein: 35, carbohydrate: 35, fat: 30 };
    case 'gain':
      return { protein: 30, carbohydrate: 45, fat: 25 };
    default:
      return { protein: 30, carbohydrate: 40, fat: 30 };
  }
}

function mapPlanRecord(record: typeof plans.$inferSelect): DietPlanRecord {
  return {
    id: record.id,
    user_id: record.user_id,
    goal: record.goal,
    duration_days: record.duration_days,
    status: record.status as 'active' | 'archived',
    daily_calorie_target: record.daily_calorie_target,
    macro_ratio: record.macro_ratio as MacroRatio,
    phase_descriptions: record.phase_descriptions as string[],
    notes: record.notes,
    created_at: record.created_at.toISOString(),
  };
}

function toPlanInsert(plan: DietPlanRecord): typeof plans.$inferInsert {
  return {
    id: plan.id,
    user_id: plan.user_id,
    goal: plan.goal,
    duration_days: plan.duration_days,
    status: plan.status,
    daily_calorie_target: plan.daily_calorie_target,
    macro_ratio: plan.macro_ratio,
    phase_descriptions: plan.phase_descriptions,
    notes: plan.notes,
    created_at: new Date(plan.created_at),
  };
}
