import type { AIServerService } from '../ai/ai.service.js';
import type { PlanService } from '../plan/plan.service.js';
import type { RecipeService } from '../recipe/recipe.service.js';
import { buildReportPrompt } from './report.prompts.js';
import type { TrackingService } from '../tracking/tracking.service.js';

export interface HealthReport {
  type: 'weekly' | 'monthly';
  generated_at: string;
  weight_trend: { latest_weight: number | null; entries_count: number };
  execution_rate: number;
  calorie_summary: { actual: number; target: number };
  ai_summary: string;
}

export interface ReportService {
  generate(userId: string, type: 'weekly' | 'monthly'): Promise<HealthReport>;
  getLatest(userId: string, type: 'weekly' | 'monthly'): HealthReport | null;
}

export function createReportService(
  aiService: AIServerService,
  planService: PlanService,
  recipeService: RecipeService,
  trackingService: TrackingService,
): ReportService {
  const reports = new Map<string, Map<'weekly' | 'monthly', HealthReport>>();

  return {
    async generate(userId, type) {
      const weights = trackingService.listWeights(userId);
      const streak = trackingService.getStreak(userId);
      const plan = planService.getCurrentPlan(userId);
      const recipes = recipeService.listDailyRecipes(userId);

      const actual = recipes.reduce((sum, day) => sum + day.total_calories, 0);
      const target = (plan?.daily_calorie_target ?? 0) * Math.max(1, recipes.length);
      const execution_rate = recipes.length > 0 ? Math.min(1, streak / recipes.length) : 0;

      const ai = await aiService.chat(
        [
          {
            role: 'user',
            content: buildReportPrompt({
              type,
              streak,
              actualCalories: actual,
              targetCalories: target,
            }),
          },
        ],
        {
          provider: 'mock',
          mockResponse:
            type === 'weekly'
              ? '本周整体执行稳定，继续保持。'
              : '本月整体趋势向好，继续维持当前节奏。',
        },
      );

      const report: HealthReport = {
        type,
        generated_at: new Date().toISOString(),
        weight_trend: {
          latest_weight: weights.length ? weights[weights.length - 1].weight_kg : null,
          entries_count: weights.length,
        },
        execution_rate,
        calorie_summary: { actual, target },
        ai_summary: ai.content,
      };

      const current = reports.get(userId) ?? new Map<'weekly' | 'monthly', HealthReport>();
      current.set(type, report);
      reports.set(userId, current);

      return report;
    },

    getLatest(userId, type) {
      return reports.get(userId)?.get(type) ?? null;
    },
  };
}
