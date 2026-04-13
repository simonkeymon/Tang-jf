export type ShoppingItemCategory =
  | 'groceries'
  | 'produce'
  | 'protein'
  | 'dairy'
  | 'pantry'
  | 'frozen'
  | 'other';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  note?: string;
  acquired?: boolean;
  category?: ShoppingItemCategory;
}

export interface ShoppingList {
  id: string;
  userId?: string;
  items?: ShoppingItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShoppingListSummary {
  totalItems: number;
  categoryCounts?: Record<ShoppingItemCategory, number>;
}
