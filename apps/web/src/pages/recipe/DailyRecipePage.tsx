import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, PageContainer } from '@tang/shared';

import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

type RecipeItem = {
  id: string;
  meal_type: string;
  title: string;
  cuisine_type: string;
  nutrition: { calories: number; protein?: number; carbohydrate?: number; fat?: number };
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
  const [error, setError] = useState('');
  const [workingMealId, setWorkingMealId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void loadTodayRecipe();
  }, []);

  async function loadTodayRecipe() {
    try {
      const response = await api.get('/recipe/today');
      setRecipePlan(response.data.recipePlan);
      setMessage('');
    } catch {
      setRecipePlan(null);
      setMessage('今日还没有食谱，请先生成。');
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');

    try {
      const response = await api.post('/recipe/generate-daily', {
        date: new Date().toISOString().slice(0, 10),
      });
      setRecipePlan(response.data.recipePlan);
      setMessage('今日食谱已生成。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setGenerating(false);
    }
  }

  async function handleFavorite(recipeId: string) {
    setWorkingMealId(recipeId);
    setError('');
    try {
      await api.post(`/recipe/${recipeId}/favorite`);
      setMessage('已加入收藏');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorkingMealId(null);
    }
  }

  async function handleSwap(recipeId: string) {
    setWorkingMealId(recipeId);
    setError('');
    try {
      await api.post(`/recipe/${recipeId}/swap`);
      await loadTodayRecipe();
      setMessage('已为你替换一份新食谱');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorkingMealId(null);
    }
  }

  async function handleCheckin(mealType: string) {
    setWorkingMealId(mealType);
    setError('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/tracking/checkin', {
        date: today,
        meal_type: mealType,
        status: 'completed',
      });
      setMessage(`${mealType} 已打卡`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorkingMealId(null);
    }
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
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">今日食谱</h1>
          <p className="page-subtitle">
            三餐与加餐已经和你的计划目标打通，可以收藏、换一份和直接打卡。
          </p>
        </div>
        <div className="button-row">
          <Link to="/plan">
            <Button type="button" variant="ghost">
              回到计划
            </Button>
          </Link>
          <Button type="button" onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : recipePlan ? '重新生成' : '生成今日食谱'}
          </Button>
        </div>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      {recipePlan ? (
        <Card className="surface-card">
          <div className="stats-grid">
            <Metric label="总热量" value={`${recipePlan.total_calories} kcal`} />
            <Metric label="目标热量" value={`${recipePlan.target_calories} kcal`} />
            <Metric label="餐次数" value={`${recipePlan.meals.length} 份`} />
          </div>
        </Card>
      ) : null}

      {!recipePlan ? (
        <Card className="surface-card" style={{ marginTop: 24 }}>
          <div className="empty-state">
            <p>今日还没有食谱。</p>
            <p className="muted">建议先完成资料与计划，再点击上方按钮生成。</p>
          </div>
        </Card>
      ) : (
        <div className="stack" style={{ marginTop: 24 }}>
          {groupedMeals.map(([mealType, meals]) => (
            <section key={mealType} className="stack">
              <h2 style={{ marginBottom: 0 }}>{mealType}</h2>
              {meals.map((meal) => (
                <Card key={meal.id} className="surface-card">
                  <div className="page-header" style={{ marginBottom: 16 }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{meal.title}</h3>
                      <p className="page-subtitle" style={{ marginTop: 8 }}>
                        {meal.cuisine_type} · {meal.nutrition.calories} kcal · 约{' '}
                        {meal.cook_time_minutes} 分钟
                      </p>
                    </div>
                    <span className="pill">{meal.meal_type}</span>
                  </div>

                  <div className="button-row">
                    <Link to={`/recipe/${meal.id}`}>
                      <Button type="button" variant="secondary">
                        查看详情
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleCheckin(meal.meal_type)}
                      disabled={workingMealId !== null}
                    >
                      {workingMealId === meal.meal_type ? '提交中...' : '已完成'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleFavorite(meal.id)}
                      disabled={workingMealId !== null}
                    >
                      {workingMealId === meal.id ? '处理中...' : '收藏'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleSwap(meal.id)}
                      disabled={workingMealId !== null}
                    >
                      {workingMealId === meal.id ? '替换中...' : '换一份'}
                    </Button>
                  </div>
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value" style={{ fontSize: '1.3rem' }}>
        {value}
      </p>
    </div>
  );
}
