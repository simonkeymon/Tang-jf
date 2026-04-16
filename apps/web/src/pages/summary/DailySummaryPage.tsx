import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, PageContainer } from '@tang/shared';

import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

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
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void loadSummary();
  }, [date]);

  async function loadSummary() {
    try {
      const endpoint = date ? `/summary/${date}` : '/summary/today';
      const response = await api.get(endpoint);
      setSummary(response.data.summary);
      setMessage('');
    } catch {
      setSummary(null);
      setMessage('当前还没有总结，请先生成。');
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');

    try {
      const today = new Date().toISOString().slice(0, 10);
      const response = await api.post('/summary/generate', { date: date ?? today });
      setSummary(response.data.summary);
      setMessage('总结已生成');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">每日总结</h1>
          <p className="page-subtitle">查看执行率、热量差值以及 AI 给你的复盘建议。</p>
        </div>
        <div className="button-row">
          <Link to="/tracking">
            <Button type="button" variant="ghost">
              先去打卡
            </Button>
          </Link>
          <Button type="button" onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '生成今日总结'}
          </Button>
        </div>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      {!summary ? (
        <Card className="surface-card">
          <div className="empty-state">
            <p>当前还没有总结。</p>
            <p className="muted">完成今日食谱与打卡后，点击上方按钮即可生成复盘。</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="stats-grid">
            <Card className="surface-card">
              <p className="metric-label">日期</p>
              <p className="metric-value">{summary.date}</p>
            </Card>
            <Card className="surface-card">
              <p className="metric-label">完成率</p>
              <p className="metric-value">{Math.round(summary.meal_completion_rate * 100)}%</p>
            </Card>
            <Card className="surface-card">
              <p className="metric-label">热量差值</p>
              <p className="metric-value">{summary.actual_vs_target_calories.delta} kcal</p>
            </Card>
            <Card className="surface-card">
              <p className="metric-label">连续打卡</p>
              <p className="metric-value">{summary.streak} 天</p>
            </Card>
          </div>

          <section style={{ marginTop: 24 }} className="content-grid">
            <Card className="surface-card">
              <h2>关键数据</h2>
              <div className="table-like-row">
                <span>实际热量</span>
                <strong>{summary.actual_vs_target_calories.actual} kcal</strong>
              </div>
              <div className="table-like-row">
                <span>目标热量</span>
                <strong>{summary.actual_vs_target_calories.target} kcal</strong>
              </div>
              <div className="table-like-row">
                <span>今日体重</span>
                <strong>
                  {summary.weight_entry ? `${summary.weight_entry.weight_kg} kg` : '今日未记录'}
                </strong>
              </div>
            </Card>

            <Card className="surface-card">
              <h2>AI 反馈</h2>
              <p className="muted" style={{ marginBottom: 0 }}>
                {summary.ai_feedback}
              </p>
            </Card>

            <Card className="surface-card" style={{ gridColumn: '1 / -1' }}>
              <h2>明日预告</h2>
              <p className="muted" style={{ marginBottom: 0 }}>
                {summary.tomorrow_preview}
              </p>
            </Card>
          </section>
        </>
      )}
    </PageContainer>
  );
}
