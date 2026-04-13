export function buildReportPrompt(input: {
  type: 'weekly' | 'monthly';
  streak: number;
  actualCalories: number;
  targetCalories: number;
}): string {
  return [
    `Create a ${input.type} health report summary.`,
    `Streak: ${input.streak}`,
    `Actual calories: ${input.actualCalories}`,
    `Target calories: ${input.targetCalories}`,
  ].join('\n');
}
