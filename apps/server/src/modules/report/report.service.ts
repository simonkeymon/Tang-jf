import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { reports } from '../../db/schema/index.js';
import type { AIServerService } from '../ai/ai.service.js';
import type { PlanService } from '../plan/plan.service.js';
import type { RecipeService } from '../recipe/recipe.service.js';
import type { TrackingService } from '../tracking/tracking.service.js';
import { buildReportPrompt } from './report.prompts.js';

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
): ReportService & { hydrate?(): Promise<void> } {
  const reportsByUser = new Map<string, Map<'weekly' | 'monthly', HealthReport>>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      reportsByUser.clear();
      const rows = await db.select().from(reports).orderBy(desc(reports.generated_at));

      for (const row of rows) {
        const current =
          reportsByUser.get(row.user_id) ?? new Map<'weekly' | 'monthly', HealthReport>();
        if (!current.has(row.type as 'weekly' | 'monthly')) {
          current.set(row.type as 'weekly' | 'monthly', mapReportRow(row));
        }
        reportsByUser.set(row.user_id, current);
      }
    },

    async generate(userId, type) {
      const weights = trackingService.listWeights(userId);
      const streak = trackingService.getStreak(userId);
      const plan = planService.getCurrentPlan(userId);
      const recipePlans = recipeService.listDailyRecipes(userId);

      const actual = recipePlans.reduce((sum, day) => sum + day.total_calories, 0);
      const target = (plan?.daily_calorie_target ?? 0) * Math.max(1, recipePlans.length);
      const execution_rate = recipePlans.length > 0 ? Math.min(1, streak / recipePlans.length) : 0;

      const ai = await aiService.chatForUser(
        userId,
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

      const current = reportsByUser.get(userId) ?? new Map<'weekly' | 'monthly', HealthReport>();
      current.set(type, report);
      reportsByUser.set(userId, current);
      persistReport(userId, report);

      return report;
    },

    getLatest(userId, type) {
      return reportsByUser.get(userId)?.get(type) ?? null;
    },
  };
}

function persistReport(userId: string, report: HealthReport) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db
      .delete(reports)
      .where(and(eq(reports.user_id, userId), eq(reports.type, report.type)));
    await db.insert(reports).values({
      id: randomUUID(),
      user_id: userId,
      type: report.type,
      generated_at: new Date(report.generated_at),
      latest_weight: report.weight_trend.latest_weight,
      entries_count: report.weight_trend.entries_count,
      execution_rate: report.execution_rate,
      actual_calories: report.calorie_summary.actual,
      target_calories: report.calorie_summary.target,
      ai_summary: report.ai_summary,
    });
  })();
}

function mapReportRow(row: typeof reports.$inferSelect): HealthReport {
  return {
    type: row.type as 'weekly' | 'monthly',
    generated_at: row.generated_at.toISOString(),
    weight_trend: {
      latest_weight: row.latest_weight,
      entries_count: row.entries_count,
    },
    execution_rate: row.execution_rate,
    calorie_summary: {
      actual: row.actual_calories,
      target: row.target_calories,
    },
    ai_summary: row.ai_summary,
  };
}
