import { randomUUID } from 'node:crypto';

import type { AIChatMessage } from '@tang/shared';

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
): PlanService {
  const plansByUser = new Map<string, DietPlanRecord[]>();

  return {
    async generatePlan(userId) {
      const profile = userService.getProfile(userId);
      if (!profile) {
        throw new PlanError(404, 'Profile not found');
      }

      const prompt = buildPlanPrompt({ profile });
      const aiMessages: AIChatMessage[] = [{ role: 'user', content: prompt }];
      const aiResponse = await aiService.chat(aiMessages, {
        provider: 'mock',
        mockResponse: `Plan for ${profile.goal}`,
      });

      const plan = buildPlan(profile, aiResponse.content, userId);
      const existingPlans = plansByUser.get(userId) ?? [];
      const archivedPlans = existingPlans.map((existingPlan) => ({
        ...existingPlan,
        status: 'archived' as const,
      }));

      plansByUser.set(userId, [plan, ...archivedPlans]);
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
