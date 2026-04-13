import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../lib/api';

type RecipeItem = {
  id: string;
  meal_type: string;
  title: string;
  cuisine_type: string;
  nutrition: { calories: number };
  cook_time_minutes: number;
};

type RecipePlan = {
  meals: RecipeItem[];
  total_calories: number;
  target_calories: number;
};

export default function DailyRecipePage() {
  const [recipePlan, setRecipePlan] = useState<RecipePlan | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadTodayRecipe();
  }, []);

  async function loadTodayRecipe() {
    try {
      const res = await api.get('/recipe/today');
      setRecipePlan(res.data.recipePlan);
      setMessage('');
    } catch {
      setRecipePlan(null);
      setMessage('今日还没有食谱，请先在计划页生成。');
    }
  }

  async function handleFavorite(recipeId: string) {
    await api.post(`/recipe/${recipeId}/favorite`);
    setMessage('已加入收藏');
  }

  async function handleSwap(recipeId: string) {
    await api.post(`/recipe/${recipeId}/swap`);
    await loadTodayRecipe();
    setMessage('已为你替换一份新食谱');
  }

  async function handleCheckin(mealType: string) {
    const today = new Date().toISOString().slice(0, 10);
    await api.post('/tracking/checkin', {
      date: today,
      meal_type: mealType,
      status: 'completed',
    });
    setMessage(`${mealType} 已打卡`);
  }

  const groupedMeals = useMemo(() => {
    const groups = new Map<string, RecipeItem[]>();
    for (const meal of recipePlan?.meals ?? []) {
      const current = groups.get(meal.meal_type) ?? [];
      current.push(meal);
      groups.set(meal.meal_type, current);
    }
    return [...groups.entries()];
  }, [recipePlan]);

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>今日食谱</h1>
      {recipePlan ? (
        <p>
          总热量 {recipePlan.total_calories} / 目标 {recipePlan.target_calories} kcal
        </p>
      ) : null}
      {message ? <p>{message}</p> : null}

      {!recipePlan ? (
        <p>今日还没有食谱，请先返回首页生成计划与食谱。</p>
      ) : (
        groupedMeals.map(([mealType, meals]) => (
          <section key={mealType} style={{ marginBottom: 24 }}>
            <h2>{mealType}</h2>
            {meals.map((meal) => (
              <article
                key={meal.id}
                style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}
              >
                <h3>{meal.title}</h3>
                <p>
                  {meal.cuisine_type} · {meal.nutrition.calories} kcal · 约 {meal.cook_time_minutes}{' '}
                  分钟
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link to={`/recipe/${meal.id}`}>查看详情</Link>
                  <button type="button" onClick={() => handleCheckin(meal.meal_type)}>
                    已完成
                  </button>
                  <button type="button" onClick={() => handleFavorite(meal.id)}>
                    收藏
                  </button>
                  <button type="button" onClick={() => handleSwap(meal.id)}>
                    换一份
                  </button>
                </div>
              </article>
            ))}
          </section>
        ))
      )}
    </main>
  );
}
