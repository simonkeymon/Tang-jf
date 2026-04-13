import type { PlanService } from '../plan/plan.service.js';
import type { RecipeService } from '../recipe/recipe.service.js';
import type { TrackingService } from '../tracking/tracking.service.js';

export interface AchievementRecord {
  id: string;
  type: 'streak' | 'completion';
  name: string;
  description: string;
  unlocked: boolean;
  achievedAt?: string;
}

export interface AchievementService {
  listAchievements(userId: string): AchievementRecord[];
}

const ACHIEVEMENTS: Array<Omit<AchievementRecord, 'unlocked' | 'achievedAt'>> = [
  {
    id: 'streak-3',
    type: 'streak',
    name: '坚持3天',
    description: '连续完成 3 天有效打卡',
  },
  {
    id: 'first-plan',
    type: 'completion',
    name: '迈出第一步',
    description: '首次生成饮食计划',
  },
  {
    id: 'favorite-recipe',
    type: 'completion',
    name: '收藏家',
    description: '首次收藏食谱',
  },
];

export function createAchievementService(
  trackingService: TrackingService,
  planService: PlanService,
  recipeService: RecipeService,
): AchievementService {
  return {
    listAchievements(userId) {
      const streak = trackingService.getStreak(userId);
      const hasPlan = planService.listPlans(userId).length > 0;
      const hasFavorite = recipeService.listFavorites(userId).length > 0;

      return ACHIEVEMENTS.map((achievement) => {
        const unlocked =
          (achievement.id === 'streak-3' && streak >= 3) ||
          (achievement.id === 'first-plan' && hasPlan) ||
          (achievement.id === 'favorite-recipe' && hasFavorite);

        return {
          ...achievement,
          unlocked,
          achievedAt: unlocked ? new Date().toISOString() : undefined,
        };
      });
    },
  };
}
