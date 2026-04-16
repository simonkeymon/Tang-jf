import { randomUUID } from 'node:crypto';

import { desc, eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { shopping_items, shopping_lists } from '../../db/schema/index.js';
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

export function createShoppingService(
  recipeService: RecipeService,
): ShoppingService & { hydrate?(): Promise<void> } {
  const lists = new Map<string, ShoppingList[]>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      lists.clear();
      const [listRows, itemRows] = await Promise.all([
        db.select().from(shopping_lists).orderBy(desc(shopping_lists.created_at)),
        db.select().from(shopping_items),
      ]);

      const itemsByListId = new Map<string, ShoppingListItem[]>();
      for (const row of itemRows) {
        const current = itemsByListId.get(row.list_id) ?? [];
        current.push({
          id: row.id,
          name: row.name,
          total_quantity: row.total_quantity,
          category: row.category as ShoppingListItem['category'],
          purchased: row.purchased,
          staple: row.staple,
        });
        itemsByListId.set(row.list_id, current);
      }

      for (const row of listRows) {
        const current = lists.get(row.user_id) ?? [];
        current.push({
          id: row.id,
          user_id: row.user_id,
          days: row.days,
          items: itemsByListId.get(row.id) ?? [],
        });
        lists.set(row.user_id, current);
      }
    },

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
        for (const meal of recipePlan.meals) {
          for (const ingredient of meal.ingredients) {
            const key = ingredient.name;
            const parsedQuantity = Number(ingredient.quantity) || 1;
            const existing = ingredientsMap.get(key);
            if (existing) {
              existing.quantity += parsedQuantity;
            } else {
              ingredientsMap.set(key, {
                quantity: parsedQuantity,
                unit: ingredient.unit,
                category: categorizeIngredient(ingredient.name),
                staple: isStaple(ingredient.name),
              });
              continue;
            }
            ingredientsMap.set(key, existing);
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
      persistList(list);
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
      persistItemPurchase(itemId, purchased);
      return item;
    },
  };
}

function persistList(list: ShoppingList) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db.delete(shopping_items).where(eq(shopping_items.list_id, list.id));
    await db.delete(shopping_lists).where(eq(shopping_lists.id, list.id));
    await db.insert(shopping_lists).values({
      id: list.id,
      user_id: list.user_id,
      days: list.days,
      created_at: new Date(),
    });

    if (list.items.length > 0) {
      await db.insert(shopping_items).values(
        list.items.map((item) => ({
          id: item.id,
          list_id: list.id,
          name: item.name,
          total_quantity: item.total_quantity,
          category: item.category,
          purchased: item.purchased,
          staple: item.staple,
        })),
      );
    }
  })();
}

function persistItemPurchase(itemId: string, purchased: boolean) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void db.update(shopping_items).set({ purchased }).where(eq(shopping_items.id, itemId));
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
