import type { Recipe } from '@tang/shared';

// Runtime helper to create a minimal mock Recipe object for tests
export function createMockRecipe(partial?: Partial<Recipe>): Recipe {
  const base: Recipe = {
    id: 'mock-recipe-1',
    name: 'Mock Recipe',
  } as Recipe;
  return { ...base, ...(partial ?? {}) } as Recipe;
}
