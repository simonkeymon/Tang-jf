import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

type Achievement = {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
};

export default function AchievementPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadAchievements();
  }, []);

  async function loadAchievements() {
    const res = await api.get('/achievements');
    const next = res.data.achievements;
    setAchievements(next);
    if (next.some((item: Achievement) => item.unlocked)) {
      setMessage('🎉 有新的成就已解锁');
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>成就中心</h1>
      {message ? <p>{message}</p> : null}
      <ul>
        {achievements.map((achievement) => (
          <li key={achievement.id} style={{ marginBottom: 12 }}>
            <strong>{achievement.name}</strong> - {achievement.description} -{' '}
            {achievement.unlocked ? '已解锁' : '未解锁'}
          </li>
        ))}
      </ul>
    </main>
  );
}
