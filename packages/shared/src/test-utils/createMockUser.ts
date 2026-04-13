import type { User } from '@tang/shared';

// Runtime helper to create a minimal mock User object for tests
export function createMockUser(partial?: Partial<User>): User {
  const base: User = {
    id: 'mock-user-1',
    email: 'mock@example.com',
  } as User;
  return { ...base, ...(partial ?? {}) } as User;
}
