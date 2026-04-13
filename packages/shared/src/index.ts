// Minimal placeholder API for the shared package to validate imports
export type Placeholder = { ok: true };
export const placeholder = (): Placeholder => ({ ok: true });

// Re-export type definitions for TypeScript consumers only (no runtime exports)
export type {
  User,
  UserProfile,
  Gender,
  UserGoal,
  DietaryRestriction,
  // from user.ts
} from './types/user';

export type { LoginRequest, RegisterRequest, TokenPayload, AuthResponse } from './types/auth';

export type { DietPlan, DailyPlan, MealType, PlanStatus, DietMacro } from './types/plan';

export type { Recipe, Ingredient, CookingStep, CuisineType, NutritionInfo } from './types/recipe';

export type { WeightEntry, MealCheckIn, CheckInStatus } from './types/tracking';

export type { AchievementType, Streak, Badge, Achievement } from './types/achievement';

export type {
  ShoppingList,
  ShoppingItem,
  ShoppingListSummary,
  ShoppingItemCategory,
} from './types/shopping';

export type { ChatMessage, AIRequest, AIResponse } from './types/ai';

export type { WeeklyReport, MonthlyReport, NutritionSummary } from './types/report';

export type { PaginatedResponse, ApiResponse, ErrorCode } from './types/common';

export { AIClient } from './services/ai/index.js';
export type {
  AIChatMessage,
  AIConfig,
  AIProvider,
  AIStreamChunk,
  AITextResponse,
  AIUsage,
  AIVisionImageInput,
} from './services/ai/index.js';

export { i18n, useTranslation } from './i18n/index.js';
export { Button, Card, Input, Select, PageContainer } from './ui/index.js';
