import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, PageContainer } from '@tang/shared';

import { api } from '../../lib/api';
import {
  triggerRecipeGeneration,
  useGenerationStore,
} from '../../stores/generation-store';
import { getErrorMessage } from '../../utils/error-handler';

type RecipeGenerationMeta = {
  mode: 'ai' | 'mock' | 'fallback';
  provider: 'openai-compatible' | 'mock';
  model: string;
  generated_at: string;
  reason?: string;
};

type RecipeItem = {
  id: string;
  meal_type: string;
  title: string;
  cuisine_type: string;
  nutrition: { calories: number; protein?: number; carbohydrate?: number; fat?: number };
  cook_time_minutes: number;
  generation_meta?: RecipeGenerationMeta;
};

type RecipePlan = {
  meals: RecipeItem[];
  total_calories: number;
  target_calories: number;
  generation_meta?: RecipeGenerationMeta;
};

export default function DailyRecipePage() {
  const today = new Date().toISOString().slice(0, 10);
  const { recipe: recipeGeneration } = useGenerationStore();
  const [recipePlan, setRecipePlan] = useState<RecipePlan | null>(null);
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [workingMealId, setWorkingMealId] = useState<string | null>(null);

  const generatingToday = recipeGeneration.pending && recipeGeneration.date === today;

  useEffect(() => {
    void loadRecipePageData();
  }, []);

  useEffect(() => {
    if (recipeGeneration.lastCompletedAt) {
      void loadTodayRecipe();
      setMessage('今日食谱已生成。');
    }
  }, [recipeGeneration.lastCompletedAt]);

  useEffect(() => {
    if (recipeGeneration.lastError) {
      setError(recipeGeneration.lastError);
    }
  }, [recipeGeneration.lastError]);

  async function loadRecipePageData() {
    await Promise.all([loadPlanState(), loadTodayRecipe()]);
  }

  async function loadPlanState() {
    try {
      await api.get('/plan/current');
      setHasPlan(true);
    } catch (requestError) {
      if (
        typeof requestError === 'object' &&
        requestError !== null &&
        'response' in requestError &&
        requestError.response &&
        typeof requestError.response === 'object' &&
        'status' in requestError.response &&
        requestError.response.status === 404
      ) {
        setHasPlan(false);
        return;
      }

      setHasPlan(null);
    }
  }

  async function loadTodayRecipe() {
    try {
      const response = await api.get('/recipe/today');
      setRecipePlan(response.data.recipePlan);
      setMessage('');
    } catch {
      setRecipePlan(null);
      if (!generatingToday) {
        setMessage('今日还没有食谱，请先生成。');
      }
    }
  }

  async function handleGenerate() {
    if (hasPlan === false) {
      setError('请先生成饮食计划，再生成今日食谱。');
      return;
    }

    setError('');
    setMessage('今日食谱正在生成中，你可以先查看其他数据，完成后会自动显示。');

    try {
      await triggerRecipeGeneration(today);
      await loadTodayRecipe();
      setMessage('今日食谱已生成。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
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

  const generationHint = hasPlan === false
    ? '请先生成饮食计划，再回来安排今天的三餐。'
    : generatingToday
      ? '今日食谱正在生成中，你可以先查看其他页面，完成后会自动显示。'
      : '三餐与加餐已经和你的计划目标打通，可以收藏、换一份和直接打卡。';

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">今日食谱</h1>
          <p className="page-subtitle">{generationHint}</p>
        </div>
        <div className="button-row">
          <Link to="/plan">
            <Button type="button" variant="ghost">
              回到计划
            </Button>
          </Link>
          <Button type="button" onClick={handleGenerate} disabled={generatingToday || hasPlan === false}>
            {generatingToday ? '生成中...' : recipePlan ? '重新生成' : '生成今日食谱'}
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
          {recipePlan.generation_meta ? (
            <div style={{ marginTop: 16 }}>
              <div className="table-like-row">
                <span className="muted">生成来源</span>
                <span className={`pill ${getGenerationClassName(recipePlan.generation_meta.mode)}`}>
                  {formatGenerationMode(recipePlan.generation_meta)}
                </span>
              </div>
              <div className="table-like-row">
                <span className="muted">模型</span>
                <strong>{recipePlan.generation_meta.model}</strong>
              </div>
              {recipePlan.generation_meta.reason ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                  当前结果里有一部分使用了系统备用方案，以保证结构完整和禁忌过滤生效。
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>
      ) : null}

      {!recipePlan ? (
        <Card className="surface-card" style={{ marginTop: 24 }}>
          <div className="empty-state">
            <p>{hasPlan === false ? '还没有饮食计划。' : '今日还没有食谱。'}</p>
            <p className="muted">
              {hasPlan === false
                ? '先生成饮食计划，系统才能根据你的目标安排今天的三餐。'
                : generatingToday
                  ? '食谱正在准备中，完成后返回此页会自动显示。'
                  : '建议先完成资料与计划，再点击上方按钮生成。'}
            </p>
            {hasPlan === false ? (
              <Link to="/plan">
                <Button type="button" variant="secondary">
                  先去生成饮食计划
                </Button>
              </Link>
            ) : null}
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
                    <div className="pill-row">
                      <span className="pill">{meal.meal_type}</span>
                      {meal.generation_meta ? (
                        <span
                          className={`pill ${getGenerationClassName(meal.generation_meta.mode)}`}
                        >
                          {formatGenerationBadge(meal.generation_meta)}
                        </span>
                      ) : null}
                    </div>
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
    <div className="surface-card metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value" style={{ fontSize: '1.3rem' }}>
        {value}
      </p>
    </div>
  );
}

function formatGenerationMode(meta: RecipeGenerationMeta) {
  if (meta.mode === 'ai') return '真实 AI 生成';
  if (meta.mode === 'mock') return '系统生成';
  return '备用方案';
}

function formatGenerationBadge(meta: RecipeGenerationMeta) {
  if (meta.mode === 'ai') return 'AI';
  if (meta.mode === 'mock') return '系统';
  return '备用';
}

function getGenerationClassName(mode: RecipeGenerationMeta['mode']) {
  if (mode === 'ai') return 'status-ok';
  if (mode === 'mock') return 'status-warning';
  return '';
}
