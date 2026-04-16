import { useEffect, useMemo, useState } from 'react';
import { Card, PageContainer } from '@tang/shared';

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

  const completionPercent = Math.min(
    100,
    Math.round(
      ((summary?.actual_vs_target_calories.actual ?? 0) /
        Math.max(1, summary?.actual_vs_target_calories.target ?? 1)) *
        100,
    ),
  );

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">进度分析</h1>
          <p className="page-subtitle">通过最近体重与热量对比，判断你是否在沿着目标前进。</p>
        </div>
        <div className="button-row">
          <button type="button" className="pill" onClick={() => setRange('7d')}>
            最近 7 天
          </button>
          <button type="button" className="pill" onClick={() => setRange('30d')}>
            最近 30 天
          </button>
        </div>
      </div>

      {!hasData ? (
        <Card className="surface-card">
          <div className="empty-state">
            <p>暂无数据。</p>
            <p className="muted">先去记录体重或生成今日总结，再回来查看趋势。</p>
          </div>
        </Card>
      ) : (
        <div className="content-grid">
          <Card className="surface-card">
            <h2>体重趋势</h2>
            <div className="chart-frame">
              <svg width="300" height="120" role="img" aria-label="weight-chart">
                <polyline fill="none" stroke="#2751db" strokeWidth="3" points={polyline} />
              </svg>
            </div>
            <ul className="list-reset">
              {weights.map((entry) => (
                <li key={entry.date} className="table-like-row">
                  <span>{entry.date}</span>
                  <strong>{entry.weight_kg} kg</strong>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="surface-card">
            <h2>热量对比</h2>
            <div className="table-like-row">
              <span>实际</span>
              <strong>{summary?.actual_vs_target_calories.actual ?? 0} kcal</strong>
            </div>
            <div className="table-like-row">
              <span>目标</span>
              <strong>{summary?.actual_vs_target_calories.target ?? 0} kcal</strong>
            </div>
            <div className="progress-bar" style={{ marginTop: 16 }}>
              <div className="progress-fill" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="muted">当前热量完成度 {completionPercent}%</p>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
