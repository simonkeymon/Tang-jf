import { describe, it, expect } from 'vitest';
import { createMockUser, createMockRecipe } from '../index';
import type { User, Recipe } from '@tang/shared';

describe('test-utils: mocks', () => {
  it('should create a valid mock User when given partials', () => {
    const user = createMockUser({ id: 'custom-id' } as Partial<User>);
    // Real fields exist
    expect(user.id).toBe('custom-id');
    expect(user.email).toContain('@');
  });

  it('should create a valid mock Recipe when given partials', () => {
    const recipe = createMockRecipe({
      name: 'Custom Recipe',
      id: 'custom-id-2',
    } as Partial<Recipe>);
    expect(recipe.name).toBe('Custom Recipe');
    expect(recipe.id).toBe('custom-id-2');
  });
});
