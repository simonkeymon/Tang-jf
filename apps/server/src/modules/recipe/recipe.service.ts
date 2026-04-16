import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { plans, recipes } from '../../db/schema/index.js';
import type { AIServerService } from '../ai/ai.service.js';
import type { PlanService } from '../plan/plan.service.js';
import type { UserService } from '../user/user.service.js';
import { buildRecipePrompt } from './recipe.prompts.js';

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
}

export interface DailyRecipeItem {
  id: string;
  meal_type: '早餐' | '午餐' | '晚餐' | '加餐';
  title: string;
  cuisine_type: '川菜' | '粤菜' | '苏菜' | '鲁菜' | '湘菜' | '闽菜' | '浙菜' | '徽菜' | '家常菜';
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  steps: Array<{ order: number; instruction: string }>;
  nutrition: RecipeNutrition;
  cook_time_minutes: number;
  date?: string;
  plan_id?: string;
  user_id?: string;
  is_favorite?: boolean;
}

export interface DailyRecipePlan {
  id: string;
  user_id: string;
  plan_id: string;
  date: string;
  meals: DailyRecipeItem[];
  total_calories: number;
  target_calories: number;
}

export interface RecipeService {
  generateDailyRecipe(userId: string, date: string): Promise<DailyRecipePlan>;
  getDailyRecipe(userId: string, date: string): DailyRecipePlan | null;
  getTodayRecipe(userId: string): DailyRecipePlan | null;
  listDailyRecipes(userId: string): DailyRecipePlan[];
  getRecipe(userId: string, recipeId: string): DailyRecipeItem | null;
  generateRecipesFromIngredients(
    userId: string,
    ingredients: string[],
    meals: number,
  ): Promise<DailyRecipeItem[]>;
  favoriteRecipe(userId: string, recipeId: string): DailyRecipeItem;
  unfavoriteRecipe(userId: string, recipeId: string): void;
  listFavorites(userId: string): DailyRecipeItem[];
  swapRecipe(userId: string, recipeId: string): Promise<DailyRecipeItem>;
}

export class RecipeError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'RecipeError';
  }
}

export function createRecipeService(
  planService: PlanService,
  aiService: AIServerService,
  userService: UserService,
): RecipeService & { hydrate?(): Promise<void> } {
  const dailyRecipes = new Map<string, DailyRecipePlan[]>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      const recipeRows = await db.select().from(recipes);
      const planRows = await db.select().from(plans);
      const plansById = new Map(planRows.map((plan) => [plan.id, plan]));
      dailyRecipes.clear();

      for (const row of recipeRows) {
        const planRecord = plansById.get(row.plan_id);
        if (!planRecord) {
          continue;
        }

        const userPlans = dailyRecipes.get(planRecord.user_id) ?? [];
        const userPlan = userPlans.find(
          (plan) => plan.plan_id === row.plan_id && plan.date === row.date,
        );
        const meal = mapRecipeRow(row);

        if (userPlan) {
          userPlan.meals.push(meal);
          userPlan.total_calories += meal.nutrition.calories;
          continue;
        }

        const nextPlan: DailyRecipePlan = {
          id: `${row.plan_id}:${row.date}`,
          user_id: planRecord.user_id,
          plan_id: row.plan_id,
          date: row.date,
          meals: [meal],
          total_calories: meal.nutrition.calories,
          target_calories: planRecord.daily_calorie_target,
        };

        userPlans.push(nextPlan);
        dailyRecipes.set(planRecord.user_id, userPlans);
      }
    },

    async generateDailyRecipe(userId, date) {
      const plan = planService.getCurrentPlan(userId);
      const profile = userService.getProfile(userId);
      if (!plan) {
        throw new RecipeError(404, 'Active plan not found');
      }

      const prompt = buildRecipePrompt(plan, date);
      await aiService.chatForUser(userId, [{ role: 'user', content: prompt }], {
        mockResponse: `Recipe plan for ${date}`,
      });

      const recipePlan = buildRecipePlan(
        userId,
        plan.id,
        date,
        plan.daily_calorie_target,
        profile?.allergies ?? [],
      );
      const existing = dailyRecipes.get(userId) ?? [];
      const withoutSameDate = existing.filter((entry) => entry.date !== date);
      dailyRecipes.set(userId, [recipePlan, ...withoutSameDate]);
      persistRecipePlan(recipePlan);

      return recipePlan;
    },

    getDailyRecipe(userId, date) {
      return (dailyRecipes.get(userId) ?? []).find((entry) => entry.date === date) ?? null;
    },

    getTodayRecipe(userId) {
      const today = new Date().toISOString().slice(0, 10);
      return (dailyRecipes.get(userId) ?? []).find((entry) => entry.date === today) ?? null;
    },

    listDailyRecipes(userId) {
      return dailyRecipes.get(userId) ?? [];
    },

    getRecipe(userId, recipeId) {
      const dailyPlans = dailyRecipes.get(userId) ?? [];

      for (const dailyPlan of dailyPlans) {
        const match = dailyPlan.meals.find((meal) => meal.id === recipeId);
        if (match) {
          return match;
        }
      }

      return null;
    },

    async generateRecipesFromIngredients(userId, ingredients, meals) {
      if (ingredients.length === 0) {
        throw new RecipeError(400, 'Ingredients are required');
      }

      const plan = planService.getCurrentPlan(userId);
      if (!plan) {
        throw new RecipeError(404, 'Active plan not found');
      }

      const normalizedIngredients = ingredients
        .map((ingredient) => ingredient.trim())
        .filter(Boolean);
      const prompt = `Generate ${meals} Chinese recipes using these ingredients as much as possible: ${normalizedIngredients.join(', ')}. Goal calories: ${plan.daily_calorie_target}.`;
      await aiService.chatForUser(userId, [{ role: 'user', content: prompt }], {
        mockResponse: `Recipes from ingredients: ${normalizedIngredients.join(', ')}`,
      });

      return createRecipesFromIngredients(normalizedIngredients, meals, plan.daily_calorie_target);
    },

    favoriteRecipe(userId, recipeId) {
      const recipe = this.getRecipe(userId, recipeId);
      if (!recipe) {
        throw new RecipeError(404, 'Recipe not found');
      }

      recipe.is_favorite = true;
      persistRecipeFavorite(recipeId, true);
      return recipe;
    },

    unfavoriteRecipe(userId, recipeId) {
      const recipe = this.getRecipe(userId, recipeId);
      if (!recipe) {
        return;
      }

      recipe.is_favorite = false;
      persistRecipeFavorite(recipeId, false);
    },

    listFavorites(userId) {
      return (dailyRecipes.get(userId) ?? [])
        .flatMap((plan) => plan.meals)
        .filter((recipe) => recipe.is_favorite);
    },

    async swapRecipe(userId, recipeId) {
      const dailyPlans = dailyRecipes.get(userId) ?? [];
      const profile = userService.getProfile(userId);

      for (const dailyPlan of dailyPlans) {
        const index = dailyPlan.meals.findIndex((meal) => meal.id === recipeId);
        if (index === -1) {
          continue;
        }

        const existing = dailyPlan.meals[index];
        await aiService.chatForUser(
          userId,
          [
            {
              role: 'user',
              content: `Swap recipe for ${existing.meal_type} on ${dailyPlan.date}. Keep calories near ${existing.nutrition.calories}. Avoid allergies: ${(profile?.allergies ?? []).join(', ') || 'none'}.`,
            },
          ],
          { mockResponse: `Swap for ${existing.title}` },
        );

        const replacement = buildSwapRecipe(existing, profile?.allergies ?? []);
        replacement.date = dailyPlan.date;
        replacement.plan_id = dailyPlan.plan_id;
        replacement.user_id = userId;
        dailyPlan.meals[index] = replacement;
        dailyPlan.total_calories = dailyPlan.meals.reduce(
          (sum, meal) => sum + meal.nutrition.calories,
          0,
        );
        persistRecipeSwap(dailyPlan.plan_id, dailyPlan.date, recipeId, replacement);
        return replacement;
      }

      throw new RecipeError(404, 'Recipe not found');
    },
  };
}

function persistRecipePlan(recipePlan: DailyRecipePlan) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db
      .delete(recipes)
      .where(and(eq(recipes.plan_id, recipePlan.plan_id), eq(recipes.date, recipePlan.date)));
    await db.insert(recipes).values(
      recipePlan.meals.map((meal) => ({
        id: meal.id,
        plan_id: recipePlan.plan_id,
        date: recipePlan.date,
        meal_type: meal.meal_type,
        title: meal.title,
        cuisine_type: meal.cuisine_type,
        ingredients: meal.ingredients,
        steps: meal.steps,
        nutrition: meal.nutrition,
        cook_time_minutes: meal.cook_time_minutes,
        is_favorite: meal.is_favorite ?? false,
      })),
    );
  })();
}

function persistRecipeFavorite(recipeId: string, isFavorite: boolean) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void db.update(recipes).set({ is_favorite: isFavorite }).where(eq(recipes.id, recipeId));
}

function persistRecipeSwap(
  planId: string,
  date: string,
  recipeId: string,
  replacement: DailyRecipeItem,
) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db.delete(recipes).where(eq(recipes.id, recipeId));
    await db.insert(recipes).values({
      id: replacement.id,
      plan_id: planId,
      date,
      meal_type: replacement.meal_type,
      title: replacement.title,
      cuisine_type: replacement.cuisine_type,
      ingredients: replacement.ingredients,
      steps: replacement.steps,
      nutrition: replacement.nutrition,
      cook_time_minutes: replacement.cook_time_minutes,
      is_favorite: replacement.is_favorite ?? false,
    });
  })();
}

function mapRecipeRow(row: typeof recipes.$inferSelect): DailyRecipeItem {
  return {
    id: row.id,
    meal_type: row.meal_type as DailyRecipeItem['meal_type'],
    title: row.title,
    cuisine_type: row.cuisine_type as DailyRecipeItem['cuisine_type'],
    ingredients: row.ingredients as DailyRecipeItem['ingredients'],
    steps: row.steps as DailyRecipeItem['steps'],
    nutrition: row.nutrition as RecipeNutrition,
    cook_time_minutes: row.cook_time_minutes,
    date: row.date,
    plan_id: row.plan_id,
    is_favorite: row.is_favorite,
  };
}

function buildSwapRecipe(existing: DailyRecipeItem, allergies: string[]): DailyRecipeItem {
  const allergySet = new Set(allergies.map((item) => item.toLowerCase()));
  const ingredients = [
    { name: '豆腐', quantity: '200', unit: '克' },
    { name: '香菇', quantity: '100', unit: '克' },
    { name: '青椒', quantity: '80', unit: '克' },
    { name: '蒜末', quantity: '1', unit: '勺' },
  ].filter((ingredient) => !allergySet.has(ingredient.name.toLowerCase()));

  return {
    id: randomUUID(),
    meal_type: existing.meal_type,
    title: `${existing.title}（替换版）`,
    cuisine_type: existing.cuisine_type,
    ingredients,
    steps: [
      { order: 1, instruction: '将豆腐切块，香菇和青椒洗净备用。' },
      { order: 2, instruction: '热锅下蒜末爆香，放入豆腐轻煎。' },
      { order: 3, instruction: '加入香菇和青椒翻炒，少量盐调味即可。' },
    ],
    nutrition: {
      ...existing.nutrition,
      calories: existing.nutrition.calories,
    },
    cook_time_minutes: existing.cook_time_minutes,
    is_favorite: false,
  };
}

function createRecipesFromIngredients(
  ingredients: string[],
  meals: number,
  targetCalories: number,
): DailyRecipeItem[] {
  return Array.from({ length: meals }, (_, index) => {
    const selectedIngredients = ingredients.slice(
      0,
      Math.max(2, Math.ceil(ingredients.length / 2)),
    );
    const calories = Math.round(targetCalories / Math.max(1, meals));

    return {
      id: randomUUID(),
      meal_type: index === 0 ? '午餐' : '晚餐',
      title: `现有食材快手餐 ${index + 1}`,
      cuisine_type: '家常菜',
      ingredients: selectedIngredients.map((ingredient) => ({
        name: ingredient,
        quantity: ingredient === '大蒜' ? '1' : '120',
        unit: ingredient === '大蒜' ? '勺' : '克',
      })),
      steps: [
        { order: 1, instruction: '将现有食材清洗切配备用。' },
        { order: 2, instruction: '按耐熟程度先后下锅翻炒或炖煮。' },
        { order: 3, instruction: '少油少盐调味后装盘即可。' },
      ],
      nutrition: calculateNutrition(calories),
      cook_time_minutes: 20,
      is_favorite: false,
    };
  });
}

function buildRecipePlan(
  userId: string,
  planId: string,
  date: string,
  targetCalories: number,
  allergies: string[],
): DailyRecipePlan {
  const meals = createMeals(targetCalories, allergies).map((meal) => ({
    ...meal,
    date,
    plan_id: planId,
    user_id: userId,
    is_favorite: false,
  }));
  const total_calories = meals.reduce((sum, meal) => sum + meal.nutrition.calories, 0);

  return {
    id: `${planId}:${date}`,
    user_id: userId,
    plan_id: planId,
    date,
    meals,
    total_calories,
    target_calories: targetCalories,
  };
}

function createMeals(targetCalories: number, allergies: string[]): DailyRecipeItem[] {
  const breakfastCalories = Math.round(targetCalories * 0.25);
  const lunchCalories = Math.round(targetCalories * 0.35);
  const dinnerCalories = Math.round(targetCalories * 0.3);
  const snackCalories = targetCalories - breakfastCalories - lunchCalories - dinnerCalories;
  const allergySet = new Set(allergies.map((item) => item.toLowerCase()));
  const lunchIngredients = [
    {
      name: allergySet.has('鲈鱼') || allergySet.has('海鲜') ? '鸡胸肉' : '鲈鱼',
      quantity: '220',
      unit: '克',
    },
    { name: '西兰花', quantity: '150', unit: '克' },
    { name: '胡萝卜', quantity: '80', unit: '克' },
    { name: '姜片', quantity: '3', unit: '片' },
  ].filter((ingredient) => !allergySet.has(ingredient.name.toLowerCase()));

  return [
    {
      id: randomUUID(),
      meal_type: '早餐',
      title: '小米南瓜粥配水煮鸡蛋',
      cuisine_type: '家常菜',
      ingredients: [
        { name: '小米', quantity: '60', unit: '克' },
        { name: '南瓜', quantity: '120', unit: '克' },
        { name: '鸡蛋', quantity: '2', unit: '个' },
      ],
      steps: [
        { order: 1, instruction: '小米淘洗干净，南瓜切块备用。' },
        { order: 2, instruction: '将小米和南瓜加入锅中煮至软糯。' },
        { order: 3, instruction: '鸡蛋冷水下锅煮熟后搭配食用。' },
      ],
      nutrition: calculateNutrition(breakfastCalories),
      cook_time_minutes: 25,
      is_favorite: false,
    },
    {
      id: randomUUID(),
      meal_type: '午餐',
      title: '清蒸鲈鱼配西兰花胡萝卜',
      cuisine_type: '粤菜',
      ingredients: lunchIngredients,
      steps: [
        { order: 1, instruction: '鲈鱼清洗后铺上姜片，上锅蒸熟。' },
        { order: 2, instruction: '西兰花和胡萝卜焯水后沥干。' },
        { order: 3, instruction: '将蒸鱼和蔬菜装盘，少量酱油调味。' },
      ],
      nutrition: calculateNutrition(lunchCalories),
      cook_time_minutes: 30,
      is_favorite: false,
    },
    {
      id: randomUUID(),
      meal_type: '晚餐',
      title: '香菇鸡胸肉炒青菜',
      cuisine_type: '川菜',
      ingredients: [
        { name: '鸡胸肉', quantity: '180', unit: '克' },
        { name: '香菇', quantity: '100', unit: '克' },
        { name: '青菜', quantity: '180', unit: '克' },
        { name: '蒜末', quantity: '1', unit: '勺' },
      ],
      steps: [
        { order: 1, instruction: '鸡胸肉切片，用少量盐和淀粉抓匀。' },
        { order: 2, instruction: '热锅下蒜末爆香，放入鸡胸肉翻炒至变色。' },
        { order: 3, instruction: '加入香菇和青菜翻炒至断生。' },
      ],
      nutrition: calculateNutrition(dinnerCalories),
      cook_time_minutes: 20,
      is_favorite: false,
    },
    {
      id: randomUUID(),
      meal_type: '加餐',
      title: '无糖酸奶配苹果片',
      cuisine_type: '家常菜',
      ingredients: [
        { name: '无糖酸奶', quantity: '200', unit: '克' },
        { name: '苹果', quantity: '1', unit: '个' },
      ],
      steps: [
        { order: 1, instruction: '苹果切片装盘。' },
        { order: 2, instruction: '搭配无糖酸奶食用。' },
      ],
      nutrition: calculateNutrition(snackCalories),
      cook_time_minutes: 5,
      is_favorite: false,
    },
  ];
}

function calculateNutrition(calories: number): RecipeNutrition {
  const proteinCalories = Math.round(calories * 0.3);
  const carbCalories = Math.round(calories * 0.4);
  const fatCalories = calories - proteinCalories - carbCalories;

  return {
    calories,
    protein: Math.round(proteinCalories / 4),
    carbohydrate: Math.round(carbCalories / 4),
    fat: Math.max(1, Math.round(fatCalories / 9)),
    fiber: Math.max(3, Math.round(calories / 120)),
  };
}
