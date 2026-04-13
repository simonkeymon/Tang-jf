import { useEffect, useMemo, useState } from 'react';

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
      const res = await api.get('/recipe/today');
      setPlan(res.data.recipePlan);
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
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>营养分析</h1>
      {message ? <p>{message}</p> : null}

      {!plan ? null : (
        <>
          <section style={{ marginBottom: 24 }}>
            <h2>每日总量</h2>
            <p>热量：{totals.calories} kcal</p>
            <p>蛋白质：{totals.protein} g</p>
            <p>碳水：{totals.carbohydrate} g</p>
            <p>脂肪：{totals.fat} g</p>
            <p>纤维：{totals.fiber} g</p>
          </section>

          <section style={{ marginBottom: 24 }}>
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
            <p>
              蛋白质 {percentage.protein}% / 碳水 {percentage.carbohydrate}% / 脂肪 {percentage.fat}
              %
            </p>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2>按餐次营养分布</h2>
            <ul>
              {plan.meals.map((meal) => (
                <li key={meal.id}>
                  {meal.meal_type} · {meal.title}：蛋白质 {meal.nutrition.protein}g / 碳水{' '}
                  {meal.nutrition.carbohydrate}g / 脂肪 {meal.nutrition.fat}g
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2>建议</h2>
            <p>{recommendation}</p>
          </section>
        </>
      )}
    </main>
  );
}
