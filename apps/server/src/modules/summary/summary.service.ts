import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { summaries } from '../../db/schema/index.js';
import type { AIServerService } from '../ai/ai.service.js';
import type { DietPlanRecord, PlanService } from '../plan/plan.service.js';
import type { DailyRecipePlan, RecipeService } from '../recipe/recipe.service.js';
import type { TrackingService, WeightRecord } from '../tracking/tracking.service.js';
import type { ProfileResponse, UserService } from '../user/user.service.js';
import { buildSummaryPrompt } from './summary.prompts.js';

export interface DailySummary {
  date: string;
  meal_completion_rate: number;
  actual_vs_target_calories: {
    actual: number;
    target: number;
    delta: number;
  };
  weight_entry: WeightRecord | null;
  streak: number;
  ai_feedback: string;
  tomorrow_preview: string;
}

export interface SummaryService {
  generateSummary(userId: string, date?: string): Promise<DailySummary>;
  getSummary(userId: string, date: string): DailySummary | null;
}

export class SummaryError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'SummaryError';
  }
}

export function createSummaryService(
  aiService: AIServerService,
  planService: PlanService,
  recipeService: RecipeService,
  trackingService: TrackingService,
  userService: UserService,
): SummaryService & { hydrate?(): Promise<void> } {
  const summariesByUser = new Map<string, Map<string, DailySummary>>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      summariesByUser.clear();
      const rows = await db.select().from(summaries).orderBy(desc(summaries.created_at));
      for (const row of rows) {
        const map = summariesByUser.get(row.user_id) ?? new Map<string, DailySummary>();
        if (!map.has(row.date)) {
          map.set(row.date, mapSummaryRow(row));
        }
        summariesByUser.set(row.user_id, map);
      }
    },

    async generateSummary(userId, date = new Date().toISOString().slice(0, 10)) {
      const profile = userService.getProfile(userId);
      const currentPlan = planService.getCurrentPlan(userId);
      const recipePlan = recipeService.getDailyRecipe(userId, date);
      const checkins = trackingService.getCheckinsForDate(userId, date);
      const weightEntry = trackingService.getWeightForDate(userId, date);
      const streak = trackingService.getStreak(userId);

      const summary = await buildSummary({
        aiService,
        userId,
        date,
        profile,
        currentPlan,
        recipePlan,
        checkins,
        weightEntry,
        streak,
      });

      const byDate = summariesByUser.get(userId) ?? new Map<string, DailySummary>();
      byDate.set(date, summary);
      summariesByUser.set(userId, byDate);
      persistSummary(userId, summary);

      return summary;
    },

    getSummary(userId, date) {
      return summariesByUser.get(userId)?.get(date) ?? null;
    },
  };
}

async function buildSummary(input: {
  aiService: AIServerService;
  userId: string;
  date: string;
  profile: ProfileResponse | null;
  currentPlan: DietPlanRecord | null;
  recipePlan: DailyRecipePlan | null;
  checkins: Array<{ status: 'completed' | 'skipped' | 'partial' }>;
  weightEntry: WeightRecord | null;
  streak: number;
}): Promise<DailySummary> {
  const totalMeals = input.recipePlan?.meals.length ?? 4;
  const completedMeals = input.checkins.filter((entry) => entry.status === 'completed').length;
  const mealCompletionRate = totalMeals > 0 ? Number((completedMeals / totalMeals).toFixed(2)) : 0;
  const actualCalories = input.recipePlan?.total_calories ?? 0;
  const targetCalories =
    input.currentPlan?.daily_calorie_target ?? input.profile?.daily_calorie_target ?? 0;
  const delta = actualCalories - targetCalories;

  const prompt = buildSummaryPrompt({
    date: input.date,
    mealCompletionRate,
    actualCalories,
    targetCalories,
    streak: input.streak,
    profile: input.profile,
  });

  const ai_feedback = await createEncouragingFeedback(
    input.aiService,
    input.userId,
    prompt,
    mealCompletionRate,
    input.streak,
    actualCalories,
  );

  return {
    date: input.date,
    meal_completion_rate: mealCompletionRate,
    actual_vs_target_calories: {
      actual: actualCalories,
      target: targetCalories,
      delta,
    },
    weight_entry: input.weightEntry,
    streak: input.streak,
    ai_feedback,
    tomorrow_preview: buildTomorrowPreview(input.currentPlan, input.profile),
  };
}

async function createEncouragingFeedback(
  aiService: AIServerService,
  userId: string,
  prompt: string,
  mealCompletionRate: number,
  streak: number,
  actualCalories: number,
): Promise<string> {
  const mockResponse =
    actualCalories === 0
      ? '今天记录还不够完整，没关系，明天继续保持记录，我们一起慢慢调整。'
      : mealCompletionRate >= 0.75
        ? `今天完成得很好，继续保持，当前连续打卡 ${streak} 天。`
        : `今天已经有进步了，继续把记录补完整，当前连续打卡 ${streak} 天。`;

  const response = await aiService.chatForUser(userId, [{ role: 'user', content: prompt }], {
    mockResponse,
  });

  return response.content;
}

function buildTomorrowPreview(
  plan: DietPlanRecord | null,
  profile: ProfileResponse | null,
): string {
  if (!plan && !profile) {
    return '明天先从补充基础记录开始，我们会一起逐步建立你的节奏。';
  }

  if (!plan) {
    return `明天继续围绕 ${profile?.goal ?? '当前目标'} 保持记录，并准备创建长期计划。`;
  }

  return `明天继续执行 ${plan.goal} 计划，目标热量约 ${plan.daily_calorie_target} kcal。`;
}

function persistSummary(userId: string, summary: DailySummary) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db
      .delete(summaries)
      .where(and(eq(summaries.user_id, userId), eq(summaries.date, summary.date)));
    await db.insert(summaries).values({
      id: randomUUID(),
      user_id: userId,
      date: summary.date,
      meal_completion_rate: summary.meal_completion_rate,
      actual_calories: summary.actual_vs_target_calories.actual,
      target_calories: summary.actual_vs_target_calories.target,
      calorie_delta: summary.actual_vs_target_calories.delta,
      weight_kg: summary.weight_entry?.weight_kg ?? null,
      streak: summary.streak,
      ai_feedback: summary.ai_feedback,
      tomorrow_preview: summary.tomorrow_preview,
      created_at: new Date(),
    });
  })();
}

function mapSummaryRow(row: typeof summaries.$inferSelect): DailySummary {
  return {
    date: row.date,
    meal_completion_rate: row.meal_completion_rate,
    actual_vs_target_calories: {
      actual: row.actual_calories,
      target: row.target_calories,
      delta: row.calorie_delta,
    },
    weight_entry:
      row.weight_kg === null
        ? null
        : { user_id: row.user_id, date: row.date, weight_kg: row.weight_kg },
    streak: row.streak,
    ai_feedback: row.ai_feedback,
    tomorrow_preview: row.tomorrow_preview,
  };
}
