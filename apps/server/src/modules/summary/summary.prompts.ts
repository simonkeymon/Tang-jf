import type { ProfileResponse } from '../user/user.service.js';

export interface SummaryPromptInput {
  date: string;
  mealCompletionRate: number;
  actualCalories: number;
  targetCalories: number;
  streak: number;
  profile?: ProfileResponse | null;
}

export function buildSummaryPrompt(input: SummaryPromptInput): string {
  return [
    'Create an encouraging daily health summary.',
    `Date: ${input.date}`,
    `Meal completion rate: ${input.mealCompletionRate}`,
    `Actual calories: ${input.actualCalories}`,
    `Target calories: ${input.targetCalories}`,
    `Current streak: ${input.streak}`,
    input.profile ? `Goal: ${input.profile.goal}` : 'Goal: unknown',
  ].join('\n');
}
