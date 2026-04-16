import { FormEvent, useEffect, useState } from 'react';
import { Button, Card, Input, PageContainer } from '@tang/shared';

import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

type WeightEntry = {
  date: string;
  weight_kg: number;
  note?: string;
};

type CheckinEntry = {
  date: string;
  meal_type: string;
  status: 'completed' | 'skipped' | 'partial';
};

const MEALS: Array<CheckinEntry['meal_type']> = ['早餐', '午餐', '晚餐', '加餐'];

export default function TrackingPage() {
  const [weight, setWeight] = useState('75.0');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [todayCheckins, setTodayCheckins] = useState<CheckinEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [savingWeight, setSavingWeight] = useState(false);
  const [checkingInMeal, setCheckingInMeal] = useState<string | null>(null);

  useEffect(() => {
    void loadTracking();
  }, []);

  async function loadTracking() {
    const from = getDateOffset(-6);
    const to = getDateOffset(0);

    const [weightsRes, todayRes, streakRes] = await Promise.all([
      api.get('/tracking/weight', { params: { from, to } }),
      api.get('/tracking/checkin/today'),
      api.get('/tracking/streak'),
    ]);

    setWeights(weightsRes.data.entries);
    setTodayCheckins(todayRes.data.entries);
    setStreak(streakRes.data.streak);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingWeight(true);
    setError('');

    try {
      await api.post('/tracking/weight', {
        date: getDateOffset(0),
        weight_kg: Number(weight),
      });
      setMessage('体重已记录。');
      await loadTracking();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSavingWeight(false);
    }
  }

  async function handleCheckin(mealType: CheckinEntry['meal_type']) {
    setCheckingInMeal(mealType);
    setError('');

    try {
      await api.post('/tracking/checkin', {
        date: getDateOffset(0),
        meal_type: mealType,
        status: 'completed',
      });
      setMessage(`${mealType} 已完成打卡。`);
      await loadTracking();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setCheckingInMeal(null);
    }
  }

  const latestWeight = weights[weights.length - 1];
  const previousWeight = weights.length > 1 ? weights[weights.length - 2] : null;
  const delta =
    latestWeight && previousWeight
      ? Number((latestWeight.weight_kg - previousWeight.weight_kg).toFixed(1))
      : null;

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">记录中心</h1>
          <p className="page-subtitle">体重、餐次与连续打卡都在这里维护。</p>
        </div>
        <span className="pill status-ok">连续打卡 {streak} 天</span>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <div className="content-grid">
        <Card className="surface-card">
          <h2>记录今日体重</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">体重 (kg)</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={savingWeight}>
              {savingWeight ? '保存中...' : '记录体重'}
            </Button>
          </form>
          {latestWeight ? <p className="muted">最新体重：{latestWeight.weight_kg} kg</p> : null}
          {delta !== null ? (
            <p className="muted">
              相比上次：{delta > 0 ? '+' : ''}
              {delta} kg
            </p>
          ) : (
            <p className="muted">暂无可对比的历史体重。</p>
          )}
        </Card>

        <Card className="surface-card">
          <h2>今日餐次打卡</h2>
          <div className="quick-grid">
            {MEALS.map((meal) => {
              const completed = todayCheckins.some(
                (entry) => entry.meal_type === meal && entry.status === 'completed',
              );
              return (
                <button
                  key={meal}
                  type="button"
                  className="surface-card"
                  onClick={() => handleCheckin(meal)}
                  disabled={checkingInMeal !== null}
                  style={{
                    textAlign: 'left',
                    border: 'none',
                    background: completed ? 'rgba(220, 252, 231, 0.95)' : undefined,
                  }}
                >
                  <strong>{meal}</strong>
                  <p className="muted" style={{ marginBottom: 0 }}>
                    {completed
                      ? '今天已完成'
                      : checkingInMeal === meal
                        ? '提交中...'
                        : '点击完成打卡'}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <section style={{ marginTop: 24 }} className="content-grid">
        <Card className="surface-card">
          <h2>最近 7 天体重</h2>
          {weights.length === 0 ? (
            <div className="empty-state">
              <p>还没有体重数据。</p>
            </div>
          ) : (
            <ul className="list-reset">
              {weights.map((entry) => (
                <li key={entry.date} className="table-like-row">
                  <span>{entry.date}</span>
                  <strong>{entry.weight_kg} kg</strong>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="surface-card">
          <h2>今日完成情况</h2>
          {todayCheckins.length === 0 ? (
            <div className="empty-state">
              <p>今天还没有打卡记录。</p>
            </div>
          ) : (
            <ul className="list-reset">
              {todayCheckins.map((entry) => (
                <li key={`${entry.date}-${entry.meal_type}`} className="table-like-row">
                  <span>{entry.meal_type}</span>
                  <span className="pill status-ok">{entry.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </PageContainer>
  );
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
