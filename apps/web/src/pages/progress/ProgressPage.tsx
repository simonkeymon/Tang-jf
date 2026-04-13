import { useEffect, useMemo, useState } from 'react';

import { api } from '../../lib/api';

type WeightEntry = { date: string; weight_kg: number };
type Summary = {
  actual_vs_target_calories: { actual: number; target: number };
};

export default function ProgressPage() {
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [hasData, setHasData] = useState(true);

  useEffect(() => {
    void loadProgress();
  }, [range]);

  async function loadProgress() {
    try {
      const from = getDateOffset(range === '7d' ? -6 : -29);
      const to = getDateOffset(0);

      const [weightRes, summaryRes] = await Promise.all([
        api.get('/tracking/weight', { params: { from, to } }),
        api.get('/summary/today'),
      ]);

      const entries: WeightEntry[] = weightRes.data.entries;
      setWeights(entries);
      setSummary(summaryRes.data.summary);
      setHasData(entries.length > 0 || Boolean(summaryRes.data.summary));
    } catch {
      setWeights([]);
      setSummary(null);
      setHasData(false);
    }
  }

  const polyline = useMemo(() => {
    if (weights.length === 0) return '';
    const values = weights.map((item) => item.weight_kg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1, max - min);

    return weights
      .map((entry, index) => {
        const x = (index / Math.max(1, weights.length - 1)) * 280 + 10;
        const y = 100 - ((entry.weight_kg - min) / span) * 80 + 10;
        return `${x},${y}`;
      })
      .join(' ');
  }, [weights]);

  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>进度分析</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setRange('7d')}>
          7天
        </button>
        <button type="button" onClick={() => setRange('30d')}>
          30天
        </button>
      </div>

      {!hasData ? (
        <p>暂无数据</p>
      ) : (
        <>
          <section style={{ marginBottom: 24 }}>
            <h2>体重趋势</h2>
            <svg width="300" height="120" role="img" aria-label="weight-chart">
              <polyline fill="none" stroke="#0070f3" strokeWidth="3" points={polyline} />
            </svg>
            <ul>
              {weights.map((entry) => (
                <li key={entry.date}>
                  {entry.date}: {entry.weight_kg} kg
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2>热量对比</h2>
            <p>实际：{summary?.actual_vs_target_calories.actual ?? 0} kcal</p>
            <p>目标：{summary?.actual_vs_target_calories.target ?? 0} kcal</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
              <div
                style={{
                  width: 40,
                  height: `${Math.min(100, ((summary?.actual_vs_target_calories.actual ?? 0) / Math.max(1, summary?.actual_vs_target_calories.target ?? 1)) * 100)}%`,
                  background: '#0070f3',
                }}
              />
              <div style={{ width: 40, height: '100%', background: '#ddd' }} />
            </div>
          </section>

          <section>
            <h2>营养占比</h2>
            <p>蛋白质 / 碳水 / 脂肪 使用现有计划与食谱结构展示，详细图表后续增强。</p>
          </section>
        </>
      )}
    </main>
  );
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
