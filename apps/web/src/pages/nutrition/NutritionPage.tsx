import { useEffect, useMemo, useState } from 'react';
import { Card, PageContainer } from '@tang/shared';

import { api } from '../../lib/api';

type Meal = {
  id: string;
  meal_type: string;
  title: string;
  nutrition: {
    calories: number;
    protein: number;
    carbohydrate: number;
    fat: number;
    fiber: number;
  };
};

type RecipePlan = {
  meals: Meal[];
};

export default function NutritionPage() {
  const [plan, setPlan] = useState<RecipePlan | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadNutrition();
  }, []);

  async function loadNutrition() {
    try {
      const response = await api.get('/recipe/today');
      setPlan(response.data.recipePlan);
      setMessage('');
    } catch {
      setPlan(null);
      setMessage('暂无营养数据');
    }
  }

  const totals = useMemo(() => {
    const meals = plan?.meals ?? [];
    return meals.reduce(
      (acc, meal) => ({
        protein: acc.protein + meal.nutrition.protein,
        carbohydrate: acc.carbohydrate + meal.nutrition.carbohydrate,
        fat: acc.fat + meal.nutrition.fat,
        fiber: acc.fiber + meal.nutrition.fiber,
        calories: acc.calories + meal.nutrition.calories,
      }),
      { protein: 0, carbohydrate: 0, fat: 0, fiber: 0, calories: 0 },
    );
  }, [plan]);

  const percentage = useMemo(() => {
    const total = totals.protein + totals.carbohydrate + totals.fat;
    if (!total) return { protein: 0, carbohydrate: 0, fat: 0 };
    return {
      protein: Math.round((totals.protein / total) * 100),
      carbohydrate: Math.round((totals.carbohydrate / total) * 100),
      fat: Math.round((totals.fat / total) * 100),
    };
  }, [totals]);

  const recommendation =
    percentage.protein < 25
      ? '蛋白质占比偏低，可以增加鸡胸肉、鱼类或豆制品。'
      : percentage.carbohydrate > 50
        ? '碳水占比偏高，可以适当减少主食份量。'
        : '当前营养分布比较均衡，继续保持。';

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">营养分析</h1>
          <p className="page-subtitle">按今日食谱汇总总热量、宏量营养占比与每餐结构。</p>
        </div>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}

      {!plan ? null : (
        <>
          <div className="stats-grid">
            <Metric label="热量" value={`${totals.calories} kcal`} />
            <Metric label="蛋白质" value={`${totals.protein} g`} />
            <Metric label="碳水" value={`${totals.carbohydrate} g`} />
            <Metric label="脂肪" value={`${totals.fat} g`} />
          </div>

          <section style={{ marginTop: 24 }} className="content-grid">
            <Card className="surface-card">
              <h2>宏量营养占比</h2>
              <div
                style={{
                  display: 'flex',
                  height: 24,
                  width: '100%',
                  borderRadius: 8,
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: `${percentage.protein}%`, background: '#22c55e' }} />
                <div style={{ width: `${percentage.carbohydrate}%`, background: '#3b82f6' }} />
                <div style={{ width: `${percentage.fat}%`, background: '#f59e0b' }} />
              </div>
              <p className="muted">
                蛋白质 {percentage.protein}% / 碳水 {percentage.carbohydrate}% / 脂肪{' '}
                {percentage.fat}%
              </p>
            </Card>

            <Card className="surface-card">
              <h2>建议</h2>
              <p className="muted" style={{ marginBottom: 0 }}>
                {recommendation}
              </p>
            </Card>
          </section>

          <Card className="surface-card" style={{ marginTop: 24 }}>
            <h2>按餐次营养分布</h2>
            <ul className="list-reset">
              {plan.meals.map((meal) => (
                <li key={meal.id} className="table-like-row">
                  <span>
                    {meal.meal_type} · {meal.title}
                  </span>
                  <strong>
                    P {meal.nutrition.protein} / C {meal.nutrition.carbohydrate} / F{' '}
                    {meal.nutrition.fat}
                  </strong>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value" style={{ fontSize: '1.25rem' }}>
        {value}
      </p>
    </div>
  );
}
