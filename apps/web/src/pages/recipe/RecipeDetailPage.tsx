import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { api } from '../../lib/api';

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
};

export default function RecipeDetailPage() {
  const { id } = useParams();
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    void loadRecipe(id);
  }, [id]);

  async function loadRecipe(recipeId: string) {
    const res = await api.get(`/recipe/${recipeId}`);
    setRecipe(res.data.recipe);
  }

  if (!recipe) {
    return <main style={{ padding: 16 }}>加载中...</main>;
  }

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}>
      <h1>{recipe.title}</h1>
      <p>
        {recipe.cuisine_type} · 约 {recipe.cook_time_minutes} 分钟
      </p>

      <section>
        <h2>食材清单</h2>
        <ul>
          {recipe.ingredients.map((ingredient) => (
            <li key={`${ingredient.name}-${ingredient.quantity}`}>
              {ingredient.name} {ingredient.quantity}
              {ingredient.unit}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>烹饪步骤</h2>
        <ol>
          {recipe.steps.map((step) => (
            <li key={step.order}>{step.instruction}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2>营养信息</h2>
        <p>热量：{recipe.nutrition.calories} kcal</p>
        <p>蛋白质：{recipe.nutrition.protein} g</p>
        <p>碳水：{recipe.nutrition.carbohydrate} g</p>
        <p>脂肪：{recipe.nutrition.fat} g</p>
        <p>纤维：{recipe.nutrition.fiber} g</p>
      </section>
    </main>
  );
}
