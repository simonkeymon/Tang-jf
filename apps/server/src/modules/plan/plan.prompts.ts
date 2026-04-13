import type { ProfileResponse } from '../user/user.service.js';

export interface PlanPromptContext {
  profile: ProfileResponse;
}

export function buildPlanPrompt(context: PlanPromptContext): string {
  const { profile } = context;

  return [
    'Generate a long-term nutrition plan.',
    `Gender: ${profile.gender}`,
    `Age: ${profile.age}`,
    `Height(cm): ${profile.height_cm}`,
    `Weight(kg): ${profile.weight_kg}`,
    `Goal: ${profile.goal}`,
    `Activity level: ${profile.activity_level}`,
    `Dietary restrictions: ${profile.dietary_restrictions.join(', ') || 'none'}`,
    `Allergies: ${profile.allergies.join(', ') || 'none'}`,
    `BMR: ${profile.bmr}`,
    `TDEE: ${profile.tdee}`,
    `Daily calorie target: ${profile.daily_calorie_target}`,
  ].join('\n');
}
