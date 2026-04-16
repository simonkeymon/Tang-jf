import { useMemo, useState } from 'react';
import { Button, Card, PageContainer } from '@tang/shared';

import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

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
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setError('');

    try {
      const response = await api.post('/shopping/generate', { days: 7 });
      setShoppingList(response.data.shoppingList);
      setMessage('购物清单已生成');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggle(itemId: string, purchased: boolean) {
    if (!shoppingList) {
      return;
    }

    const response = await api.patch(`/shopping/${shoppingList.id}/item/${itemId}`, { purchased });
    setShoppingList({
      ...shoppingList,
      items: shoppingList.items.map((item) =>
        item.id === itemId ? { ...item, purchased: response.data.item.purchased } : item,
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
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">购物清单</h1>
          <p className="page-subtitle">根据当前食谱一键生成一周采购列表，并在这里勾选已购状态。</p>
        </div>
        <Button type="button" onClick={handleGenerate} disabled={generating}>
          {generating ? '生成中...' : '生成本周购物清单'}
        </Button>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      {!shoppingList ? (
        <Card className="surface-card">
          <div className="empty-state">
            <p>点击按钮生成购物清单。</p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="surface-card">
            <div className="stats-grid">
              <SummaryMetric label="已购" value={`${purchasedCount}`} />
              <SummaryMetric label="总项目" value={`${totalCount}`} />
              <SummaryMetric
                label="完成度"
                value={`${totalCount ? Math.round((purchasedCount / totalCount) * 100) : 0}%`}
              />
            </div>
          </Card>

          <div className="stack" style={{ marginTop: 24 }}>
            {grouped.map(([category, items]) => (
              <Card key={category} className="surface-card">
                <h2>{category}</h2>
                <ul className="list-reset">
                  {items.map((item) => (
                    <li key={item.id} className="table-like-row">
                      <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.purchased}
                          onChange={(event) => handleToggle(item.id, event.target.checked)}
                        />
                        <span style={{ textDecoration: item.purchased ? 'line-through' : 'none' }}>
                          {item.name} · {item.total_quantity}
                          {item.staple ? '（可能已有）' : ''}
                        </span>
                      </label>
                      <span className={`pill ${item.purchased ? 'status-ok' : 'status-warning'}`}>
                        {item.purchased ? '已购' : '待买'}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value" style={{ fontSize: '1.25rem' }}>
        {value}
      </p>
    </div>
  );
}
