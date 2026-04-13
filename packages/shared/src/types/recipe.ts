export type CuisineType =
  | '川菜'
  | '粤菜'
  | '苏菜'
  | '鲁菜'
  | '湘菜'
  | '闽菜'
  | '浙菜'
  | '徽菜'
  | '其他';

export interface Ingredient {
  name: string;
  quantity?: string;
  unit?: string;
}

export interface CookingStep {
  order: number;
  instruction: string;
  durationMinutes?: number;
}

export interface NutritionInfo {
  calories?: number;
  protein?: number; // g
  fat?: number; // g
  carbs?: number; // g
  fiber?: number; // g
}

export type MealAssociation = '早餐' | '午餐' | '晚餐' | '加餐' | '其他';

export interface Recipe {
  id: string;
  name: string;
  title?: string;
  cuisine?: CuisineType;
  associatedMeal?: MealAssociation;
  ingredients?: Ingredient[];
  steps?: CookingStep[];
  nutrition?: NutritionInfo;
  serves?: number;
}
