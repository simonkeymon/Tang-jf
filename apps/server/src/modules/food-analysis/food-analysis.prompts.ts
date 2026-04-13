export function buildFoodAnalysisPrompt(input: { imageUrl?: string; note?: string }): string {
  return [
    'Analyze a food image and estimate calories.',
    input.imageUrl ? `Image URL: ${input.imageUrl}` : 'Image URL: none',
    input.note ? `User note: ${input.note}` : 'User note: none',
  ].join('\n');
}
