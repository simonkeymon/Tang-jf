import { useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../lib/api';

type MealType = '早餐' | '午餐' | '晚餐' | '加餐';

export default function DiningOutPage() {
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState<MealType>('午餐');
  const [calories, setCalories] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  async function estimateCalories() {
    if (!description.trim()) {
      setMessage('请输入外出就餐描述');
      return;
    }

    const roughCalories = estimateFromText(description);
    setCalories(roughCalories);
    setMessage('已为你估算热量');
  }

  async function recordMeal() {
    const today = new Date().toISOString().slice(0, 10);
    await api.post('/tracking/checkin', {
      date: today,
      meal_type: mealType,
      status: 'completed',
    });
    setMessage(`已记录到今日${mealType}`);
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>外出就餐记录</h1>

      <label>
        描述今天吃了什么
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          style={{ width: '100%', marginTop: 8 }}
          placeholder="例如：午餐吃了一碗兰州牛肉面"
        />
      </label>

      <label style={{ display: 'block', marginTop: 16 }}>
        餐次
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          style={{ marginLeft: 8 }}
        >
          <option value="早餐">早餐</option>
          <option value="午餐">午餐</option>
          <option value="晚餐">晚餐</option>
          <option value="加餐">加餐</option>
        </select>
      </label>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" onClick={estimateCalories}>
          AI估算热量
        </button>
        <button type="button" onClick={recordMeal} disabled={calories === null}>
          记录
        </button>
        <Link to="/food-analysis">拍照分析入口</Link>
      </div>

      {calories !== null ? <p style={{ marginTop: 16 }}>估算热量：约 {calories} kcal</p> : null}
      {message ? <p>{message}</p> : null}
    </main>
  );
}

function estimateFromText(text: string): number {
  if (text.includes('牛肉面')) return 520;
  if (text.includes('盖饭')) return 650;
  if (text.includes('沙拉')) return 320;
  if (text.includes('米饭')) return 450;
  return 500;
}
