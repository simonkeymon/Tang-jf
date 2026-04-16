import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, PageContainer } from '@tang/shared';

import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

type RecipeGenerationMeta = {
  mode: 'ai' | 'mock' | 'fallback';
  provider: 'openai-compatible' | 'mock';
  model: string;
  generated_at: string;
  reason?: string;
};

type RecipeDetail = {
  id: string;
  title: string;
  cuisine_type: string;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  steps: Array<{ order: number; instruction: string }>;
  nutrition: {
    calories: number;
    protein: number;
    carbohydrate: number;
    fat: number;
    fiber: number;
  };
  cook_time_minutes: number;
  generation_meta?: RecipeGenerationMeta;
};

export default function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      return;
    }

    void loadRecipe(id);
  }, [id]);

  async function loadRecipe(recipeId: string) {
    try {
      const response = await api.get(`/recipe/${recipeId}`);
      setRecipe(response.data.recipe);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  if (!recipe) {
    return <PageContainer>{error || '加载食谱详情中...'}</PageContainer>;
  }

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">{recipe.title}</h1>
          <p className="page-subtitle">
            {recipe.cuisine_type} · 约 {recipe.cook_time_minutes} 分钟
          </p>
          {recipe.generation_meta ? (
            <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
              生成来源：{formatGenerationMode(recipe.generation_meta)} · 模型：
              {recipe.generation_meta.model}
            </p>
          ) : null}
        </div>
        <Link to="/recipe/today">
          <Button type="button" variant="ghost">
            返回今日食谱
          </Button>
        </Link>
      </div>

      <div className="content-grid">
        <Card className="surface-card">
          <h2>食材清单</h2>
          <ul className="list-reset">
            {recipe.ingredients.map((ingredient) => (
              <li key={`${ingredient.name}-${ingredient.quantity}`} className="table-like-row">
                <span>{ingredient.name}</span>
                <strong>
                  {ingredient.quantity}
                  {ingredient.unit}
                </strong>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="surface-card">
          <h2>营养信息</h2>
          <div className="table-like-row">
            <span>热量</span>
            <strong>{recipe.nutrition.calories} kcal</strong>
          </div>
          <div className="table-like-row">
            <span>蛋白质</span>
            <strong>{recipe.nutrition.protein} g</strong>
          </div>
          <div className="table-like-row">
            <span>碳水</span>
            <strong>{recipe.nutrition.carbohydrate} g</strong>
          </div>
          <div className="table-like-row">
            <span>脂肪</span>
            <strong>{recipe.nutrition.fat} g</strong>
          </div>
          <div className="table-like-row">
            <span>纤维</span>
            <strong>{recipe.nutrition.fiber} g</strong>
          </div>
        </Card>

        <Card className="surface-card" style={{ gridColumn: '1 / -1' }}>
          <h2>烹饪步骤</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {recipe.steps.map((step) => (
              <li key={step.order} style={{ marginBottom: 12 }}>
                {step.instruction}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </PageContainer>
  );
}

function formatGenerationMode(meta: RecipeGenerationMeta) {
  if (meta.mode === 'ai') return '真实 AI';
  if (meta.mode === 'mock') return '系统生成';
  return '备用方案';
}
