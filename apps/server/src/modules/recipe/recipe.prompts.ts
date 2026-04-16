import type { MacroRatio, DietPlanRecord } from '../plan/plan.service.js';
import type { ProfileResponse } from '../user/user.service.js';

type MealType = '早餐' | '午餐' | '晚餐' | '加餐';

type ExcludedTitles = Partial<Record<MealType, string[]>>;

type SwapPromptInput = {
  date: string;
  meal_type: MealType;
  title: string;
  cuisine_type: string;
  calories: number;
  ingredients: string[];
};

export function buildRecipePrompt(
  plan: DietPlanRecord,
  profile: ProfileResponse | null,
  date: string,
  options?: {
    excludedTitles?: ExcludedTitles;
  },
): string {
  return [
    'You are Tang\'s nutrition meal planner.',
    'Return ONLY valid JSON without markdown fences.',
    'JSON shape:',
    '{',
    '  "meals": [',
    '    {',
    '      "meal_type": "早餐" | "午餐" | "晚餐" | "加餐",',
    '      "title": string,',
    '      "cuisine_type": "川菜" | "粤菜" | "苏菜" | "鲁菜" | "湘菜" | "闽菜" | "浙菜" | "徽菜" | "家常菜",',
    '      "ingredients": [',
    '        { "name": string, "quantity": string, "unit": string }',
    '      ],',
    '      "steps": [string, string, string],',
    '      "cook_time_minutes": number',
    '    }',
    '  ]',
    '}',
    'Rules:',
    '- Exactly 4 meals in this order: 早餐, 午餐, 晚餐, 加餐.',
    '- All dish names, ingredients, and steps must be in concise Chinese.',
    '- Meals must align with the user goal, calorie target, and macro ratio.',
    '- Do not mention or use blocked foods in titles, ingredients, or steps.',
    '- Keep dishes practical for a home kitchen and common Chinese groceries.',
    '- Make the meals distinct from one another; avoid repeating the excluded titles.',
    `Date: ${date}`,
    `User goal: ${formatGoal(plan.goal)}`,
    `Daily calorie target: ${plan.daily_calorie_target} kcal`,
    `Macro ratio: ${formatMacroRatio(plan.macro_ratio)}`,
    `Dietary restrictions: ${formatList(profile?.dietary_restrictions)}`,
    `Allergies: ${formatList(profile?.allergies)}`,
    `Excluded titles by meal: ${formatExcludedTitles(options?.excludedTitles)}`,
  ].join('\n');
}

export function buildSwapRecipePrompt(
  plan: DietPlanRecord,
  profile: ProfileResponse | null,
  input: SwapPromptInput,
  options?: {
    excludedTitles?: string[];
  },
): string {
  return [
    'You are Tang\'s nutrition meal planner.',
    'Return ONLY valid JSON without markdown fences.',
    'JSON shape:',
    '{',
    '  "recipe": {',
    '    "meal_type": "早餐" | "午餐" | "晚餐" | "加餐",',
    '    "title": string,',
    '    "cuisine_type": "川菜" | "粤菜" | "苏菜" | "鲁菜" | "湘菜" | "闽菜" | "浙菜" | "徽菜" | "家常菜",',
    '    "ingredients": [',
    '      { "name": string, "quantity": string, "unit": string }',
    '    ],',
    '    "steps": [string, string, string],',
    '    "cook_time_minutes": number',
    '  }',
    '}',
    'Rules:',
    '- Keep the same meal_type as the original recipe.',
    '- Keep calories close to the target meal calories.',
    '- The replacement must be clearly different from the original title and main ingredients.',
    '- Do not mention or use blocked foods in titles, ingredients, or steps.',
    '- All output must be concise Chinese and practical for a home kitchen.',
    `Date: ${input.date}`,
    `User goal: ${formatGoal(plan.goal)}`,
    `Target meal calories: ${input.calories} kcal`,
    `Macro ratio: ${formatMacroRatio(plan.macro_ratio)}`,
    `Dietary restrictions: ${formatList(profile?.dietary_restrictions)}`,
    `Allergies: ${formatList(profile?.allergies)}`,
    `Original meal_type: ${input.meal_type}`,
    `Original title: ${input.title}`,
    `Original cuisine: ${input.cuisine_type}`,
    `Original ingredients: ${input.ingredients.join('、') || '无'}`,
    `Excluded titles: ${formatList(options?.excludedTitles)}`,
  ].join('\n');
}

function formatGoal(goal: string): string {
  switch (goal) {
    case 'lose':
      return '减脂';
    case 'gain':
      return '增肌';
    default:
      return '维持';
  }
}

function formatMacroRatio(macroRatio: MacroRatio): string {
  return `protein ${macroRatio.protein} / carbohydrate ${macroRatio.carbohydrate} / fat ${macroRatio.fat}`;
}

function formatList(items?: string[]): string {
  return items && items.length > 0 ? items.join(', ') : 'none';
}

function formatExcludedTitles(excludedTitles?: ExcludedTitles): string {
  if (!excludedTitles) {
    return 'none';
  }

  const chunks = Object.entries(excludedTitles)
    .filter((entry): entry is [MealType, string[]] => Array.isArray(entry[1]) && entry[1].length > 0)
    .map(([mealType, titles]) => `${mealType}: ${titles.join(' / ')}`);

  return chunks.length > 0 ? chunks.join('; ') : 'none';
}
