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
  achievements: unknown[];
}

export interface ExportService {
  exportJson(userId: string): ExportPayload;
  exportCsv(userId: string): string;
}

export function createExportService(
  userService: UserService,
  trackingService: TrackingService,
  recipeService: RecipeService,
): ExportService {
  return {
    exportJson(userId) {
      return {
        profile: userService.getProfile(userId),
        weight_entries: trackingService.listWeights(userId),
        today_checkins: trackingService.getTodayCheckins(userId),
        streak: trackingService.getStreak(userId),
        recipes: recipeService.listDailyRecipes(userId),
        favorite_recipes: recipeService.listFavorites(userId),
        achievements: [],
      };
    },

    exportCsv(userId) {
      const payload = this.exportJson(userId);
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
      ];

      return lines.join('\n');
    },
  };
}
