import { randomUUID } from 'node:crypto';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { export_history } from '../../db/schema/index.js';
import type { AchievementService } from '../achievement/achievement.service.js';
import type { RecipeService } from '../recipe/recipe.service.js';
import type { TrackingService } from '../tracking/tracking.service.js';
import type { UserService } from '../user/user.service.js';

export interface ExportPayload {
  profile: ReturnType<UserService['getProfile']>;
  weight_entries: ReturnType<TrackingService['listWeights']>;
  today_checkins: ReturnType<TrackingService['getTodayCheckins']>;
  streak: number;
  recipes: ReturnType<RecipeService['listDailyRecipes']>;
  favorite_recipes: ReturnType<RecipeService['listFavorites']>;
  achievements: ReturnType<AchievementService['listAchievements']>;
}

export interface ExportService {
  exportJson(userId: string): ExportPayload;
  exportCsv(userId: string): string;
}

export function createExportService(
  userService: UserService,
  trackingService: TrackingService,
  recipeService: RecipeService,
  achievementService?: AchievementService,
): ExportService {
  function buildPayload(userId: string): ExportPayload {
    return {
      profile: userService.getProfile(userId),
      weight_entries: trackingService.listWeights(userId),
      today_checkins: trackingService.getTodayCheckins(userId),
      streak: trackingService.getStreak(userId),
      recipes: recipeService.listDailyRecipes(userId),
      favorite_recipes: recipeService.listFavorites(userId),
      achievements: achievementService?.listAchievements(userId) ?? [],
    };
  }

  return {
    exportJson(userId) {
      const payload = buildPayload(userId);
      persistExportHistory(userId, 'json');
      return payload;
    },

    exportCsv(userId) {
      const payload = buildPayload(userId);
      const lines = [
        'section,key,value',
        `profile,goal,${payload.profile?.goal ?? ''}`,
        `profile,bmr,${payload.profile?.bmr ?? ''}`,
        `profile,tdee,${payload.profile?.tdee ?? ''}`,
        ...payload.weight_entries.map((entry) => `weight_entries,${entry.date},${entry.weight_kg}`),
        ...payload.today_checkins.map(
          (entry) => `today_checkins,${entry.meal_type},${entry.status}`,
        ),
        ...payload.favorite_recipes.map(
          (recipe) => `favorite_recipes,${recipe.id},${recipe.title}`,
        ),
        ...payload.achievements.map(
          (achievement) =>
            `achievements,${achievement.id},${achievement.unlocked ? 'unlocked' : 'locked'}`,
        ),
      ];

      persistExportHistory(userId, 'csv');
      return lines.join('\n');
    },
  };
}

function persistExportHistory(userId: string, format: 'json' | 'csv') {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void db.insert(export_history).values({
    id: randomUUID(),
    user_id: userId,
    format,
    created_at: new Date(),
  });
}
