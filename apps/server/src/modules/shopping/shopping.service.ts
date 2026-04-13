import { randomUUID } from 'node:crypto';

import type { RecipeService } from '../recipe/recipe.service.js';

export interface ShoppingListItem {
  id: string;
  name: string;
  total_quantity: string;
  category: '蔬菜' | '肉类' | '调味料' | '主食' | '乳制品' | '其他';
  purchased: boolean;
  staple: boolean;
}

export interface ShoppingList {
  id: string;
  user_id: string;
  days: number;
  items: ShoppingListItem[];
}

export interface ShoppingService {
  generate(userId: string, days: number): ShoppingList;
  getById(userId: string, listId: string): ShoppingList | null;
  updateItem(
    userId: string,
    listId: string,
    itemId: string,
    purchased: boolean,
  ): ShoppingListItem | null;
}

export class ShoppingError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ShoppingError';
  }
}

export function createShoppingService(recipeService: RecipeService): ShoppingService {
  const lists = new Map<string, ShoppingList[]>();

  return {
    generate(userId, days) {
      if (days <= 0) {
        throw new ShoppingError(400, 'days must be greater than 0');
      }

      const ingredientsMap = new Map<
        string,
        { quantity: number; unit: string; category: ShoppingListItem['category']; staple: boolean }
      >();

      const availablePlans = recipeService
        .listDailyRecipes(userId)
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, days);

      for (const recipePlan of availablePlans) {
        if (!recipePlan) {
          continue;
        }

        for (const meal of recipePlan.meals) {
          for (const ingredient of meal.ingredients) {
            const key = ingredient.name;
            const parsedQuantity = Number(ingredient.quantity) || 1;
            const existing = ingredientsMap.get(key);
            if (existing) {
              existing.quantity += parsedQuantity;
              ingredientsMap.set(key, existing);
            } else {
              ingredientsMap.set(key, {
                quantity: parsedQuantity,
                unit: ingredient.unit,
                category: categorizeIngredient(ingredient.name),
                staple: isStaple(ingredient.name),
              });
            }
          }
        }
      }

      const items: ShoppingListItem[] = [...ingredientsMap.entries()].map(([name, meta]) => ({
        id: randomUUID(),
        name,
        total_quantity: `${meta.quantity}${meta.unit}`,
        category: meta.category,
        purchased: false,
        staple: meta.staple,
      }));

      const list: ShoppingList = {
        id: randomUUID(),
        user_id: userId,
        days,
        items,
      };

      const userLists = lists.get(userId) ?? [];
      lists.set(userId, [list, ...userLists]);
      return list;
    },

    getById(userId, listId) {
      return (lists.get(userId) ?? []).find((list) => list.id === listId) ?? null;
    },

    updateItem(userId, listId, itemId, purchased) {
      const list = this.getById(userId, listId);
      if (!list) {
        return null;
      }

      const item = list.items.find((entry) => entry.id === itemId);
      if (!item) {
        return null;
      }

      item.purchased = purchased;
      return item;
    },
  };
}

function categorizeIngredient(name: string): ShoppingListItem['category'] {
  if (['西兰花', '胡萝卜', '青菜', '南瓜', '苹果', '香菇'].includes(name)) return '蔬菜';
  if (['鸡胸肉', '鲈鱼', '豆腐'].includes(name)) return '肉类';
  if (['姜片', '蒜末'].includes(name)) return '调味料';
  if (['小米', '米饭'].includes(name)) return '主食';
  if (['无糖酸奶', '鸡蛋'].includes(name)) return '乳制品';
  return '其他';
}

function isStaple(name: string): boolean {
  return ['姜片', '蒜末'].includes(name);
}
