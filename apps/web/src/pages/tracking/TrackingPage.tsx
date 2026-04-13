import { FormEvent, useEffect, useState } from 'react';

import { api } from '../../lib/api';

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

export default function TrackingPage() {
  const [weight, setWeight] = useState('75.0');
  const [message, setMessage] = useState('');
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [todayCheckins, setTodayCheckins] = useState<CheckinEntry[]>([]);
  const [streak, setStreak] = useState(0);

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
    await api.post('/tracking/weight', {
      date: getDateOffset(0),
      weight_kg: Number(weight),
    });
    setMessage('体重已记录');
    await loadTracking();
  }

  const latestWeight = weights[weights.length - 1];
  const previousWeight = weights.length > 1 ? weights[weights.length - 2] : null;
  const delta =
    latestWeight && previousWeight
      ? Number((latestWeight.weight_kg - previousWeight.weight_kg).toFixed(1))
      : null;

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>记录中心</h1>

      <section style={{ marginBottom: 24 }}>
        <h2>今日体重</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <button type="submit">记录</button>
        </form>
        {message ? <p>{message}</p> : null}
        {latestWeight ? <p>最新体重：{latestWeight.weight_kg} kg</p> : null}
        {delta !== null ? (
          <p>
            相比昨天：{delta > 0 ? '+' : ''}
            {delta} kg
          </p>
        ) : (
          <p>暂无昨日对比</p>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>最近 7 天体重</h2>
        <ul>
          {weights.map((entry) => (
            <li key={entry.date}>
              {entry.date}: {entry.weight_kg} kg
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>今日打卡</h2>
        <p>连续打卡：{streak} 天</p>
        {todayCheckins.length === 0 ? (
          <p>今天还没有打卡记录。</p>
        ) : (
          <ul>
            {todayCheckins.map((entry) => (
              <li key={`${entry.date}-${entry.meal_type}`}>
                {entry.meal_type}: {entry.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
