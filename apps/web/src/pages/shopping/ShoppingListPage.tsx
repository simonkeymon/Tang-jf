import { useMemo, useState } from 'react';

import { api } from '../../lib/api';

type ShoppingItem = {
  id: string;
  name: string;
  total_quantity: string;
  category: string;
  purchased: boolean;
  staple: boolean;
};

type ShoppingList = {
  id: string;
  items: ShoppingItem[];
};

export default function ShoppingListPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [message, setMessage] = useState('');

  async function handleGenerate() {
    const res = await api.post('/shopping/generate', { days: 7 });
    setShoppingList(res.data.shoppingList);
    setMessage('购物清单已生成');
  }

  async function handleToggle(itemId: string, purchased: boolean) {
    if (!shoppingList) return;
    const res = await api.patch(`/shopping/${shoppingList.id}/item/${itemId}`, { purchased });
    setShoppingList({
      ...shoppingList,
      items: shoppingList.items.map((item) =>
        item.id === itemId ? { ...item, purchased: res.data.item.purchased } : item,
      ),
    });
  }

  const grouped = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>();
    for (const item of shoppingList?.items ?? []) {
      const current = groups.get(item.category) ?? [];
      current.push(item);
      groups.set(item.category, current);
    }
    return [...groups.entries()];
  }, [shoppingList]);

  const purchasedCount = shoppingList?.items.filter((item) => item.purchased).length ?? 0;
  const totalCount = shoppingList?.items.length ?? 0;

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>购物清单</h1>
      <button type="button" onClick={handleGenerate}>
        生成本周购物清单
      </button>
      {message ? <p>{message}</p> : null}

      {shoppingList ? (
        <>
          <p>
            已购 {purchasedCount} / {totalCount}
          </p>
          {grouped.map(([category, items]) => (
            <section key={category} style={{ marginBottom: 24 }}>
              <h2>{category}</h2>
              <ul>
                {items.map((item) => (
                  <li
                    key={item.id}
                    style={{ textDecoration: item.purchased ? 'line-through' : 'none' }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={item.purchased}
                        onChange={(e) => handleToggle(item.id, e.target.checked)}
                      />{' '}
                      {item.name} · {item.total_quantity}
                      {item.staple ? '（可能已有）' : ''}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <p>点击按钮生成购物清单。</p>
      )}
    </main>
  );
}
