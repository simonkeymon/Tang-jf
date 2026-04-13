import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { api } from '../../lib/api';

type Summary = {
  date: string;
  meal_completion_rate: number;
  actual_vs_target_calories: {
    actual: number;
    target: number;
    delta: number;
  };
  weight_entry: { weight_kg: number } | null;
  streak: number;
  ai_feedback: string;
  tomorrow_preview: string;
};

export default function DailySummaryPage() {
  const { date } = useParams();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadSummary();
  }, [date]);

  async function loadSummary() {
    try {
      const endpoint = date ? `/summary/${date}` : '/summary/today';
      const res = await api.get(endpoint);
      setSummary(res.data.summary);
      setMessage('');
    } catch {
      setSummary(null);
      setMessage('当前还没有总结，请先生成。');
    }
  }

  async function handleGenerate() {
    const today = new Date().toISOString().slice(0, 10);
    const res = await api.post('/summary/generate', { date: date ?? today });
    setSummary(res.data.summary);
    setMessage('总结已生成');
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>每日总结</h1>
      <button type="button" onClick={handleGenerate}>
        生成今日总结
      </button>
      {message ? <p>{message}</p> : null}

      {!summary ? (
        <p>当前还没有总结，请先生成。</p>
      ) : (
        <section style={{ marginTop: 24 }}>
          <p>日期：{summary.date}</p>
          <p>完成率：{Math.round(summary.meal_completion_rate * 100)}%</p>
          <p>
            热量：{summary.actual_vs_target_calories.actual} /{' '}
            {summary.actual_vs_target_calories.target} kcal
          </p>
          <p>热量差值：{summary.actual_vs_target_calories.delta} kcal</p>
          <p>连续打卡：{summary.streak} 天</p>
          <p>
            体重：{summary.weight_entry ? `${summary.weight_entry.weight_kg} kg` : '今日未记录'}
          </p>

          <section style={{ marginTop: 16 }}>
            <h2>AI 反馈</h2>
            <p>{summary.ai_feedback}</p>
          </section>

          <section style={{ marginTop: 16 }}>
            <h2>明日预告</h2>
            <p>{summary.tomorrow_preview}</p>
          </section>
        </section>
      )}
    </main>
  );
}
