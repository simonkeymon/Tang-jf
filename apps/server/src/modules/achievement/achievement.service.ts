import { and, eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { achievements, user_achievements } from '../../db/schema/index.js';
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
): AchievementService & { hydrate?: () => Promise<void> } {
  const achievedByUser = new Map<string, Map<string, string>>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      await seedAchievementDefinitions();
      achievedByUser.clear();

      const rows = await db.select().from(user_achievements);
      for (const row of rows) {
        if (!row.user_id || !row.achievement_id || !row.acquired_at) {
          continue;
        }

        const current = achievedByUser.get(row.user_id) ?? new Map<string, string>();
        current.set(row.achievement_id, row.acquired_at.toISOString());
        achievedByUser.set(row.user_id, current);
      }
    },

    listAchievements(userId) {
      const streak = trackingService.getStreak(userId);
      const hasPlan = planService.listPlans(userId).length > 0;
      const hasFavorite = recipeService.listFavorites(userId).length > 0;
      const current = achievedByUser.get(userId) ?? new Map<string, string>();

      const result = ACHIEVEMENTS.map((achievement) => {
        const shouldUnlock =
          (achievement.id === 'streak-3' && streak >= 3) ||
          (achievement.id === 'first-plan' && hasPlan) ||
          (achievement.id === 'favorite-recipe' && hasFavorite);

        if (shouldUnlock && !current.has(achievement.id)) {
          const achievedAt = new Date().toISOString();
          current.set(achievement.id, achievedAt);
          persistUserAchievement(userId, achievement.id, achievedAt);
        }

        return {
          ...achievement,
          unlocked: current.has(achievement.id),
          achievedAt: current.get(achievement.id),
        };
      });

      achievedByUser.set(userId, current);
      return result;
    },
  };

  function persistUserAchievement(userId: string, achievementId: string, achievedAt: string) {
    const db = getDb();
    if (!db || !isDatabaseEnabled()) {
      return;
    }

    void (async () => {
      await db
        .delete(user_achievements)
        .where(
          and(
            eq(user_achievements.user_id, userId),
            eq(user_achievements.achievement_id, achievementId),
          ),
        );
      await db.insert(user_achievements).values({
        user_id: userId,
        achievement_id: achievementId,
        acquired_at: new Date(achievedAt),
      });
    })();
  }

  async function seedAchievementDefinitions() {
    const db = getDb();
    if (!db || !isDatabaseEnabled()) {
      return;
    }

    const existing = await db.select().from(achievements);
    const existingIds = new Set(existing.map((item) => item.id));
    const missing = ACHIEVEMENTS.filter((item) => !existingIds.has(item.id));

    if (missing.length === 0) {
      return;
    }

    await db.insert(achievements).values(
      missing.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        created_at: new Date(),
      })),
    );
  }
}
