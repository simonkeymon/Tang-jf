import type { DietPlanRecord } from '../plan/plan.service.js';

export function buildRecipePrompt(plan: DietPlanRecord, date: string): string {
  return [
    'Generate a Chinese daily meal plan.',
    `Date: ${date}`,
    `Goal: ${plan.goal}`,
    `Daily calorie target: ${plan.daily_calorie_target}`,
    `Macro ratio: protein ${plan.macro_ratio.protein}, carbohydrate ${plan.macro_ratio.carbohydrate}, fat ${plan.macro_ratio.fat}`,
  ].join('\n');
}
