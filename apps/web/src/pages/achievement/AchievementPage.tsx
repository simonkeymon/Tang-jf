import { useEffect, useState } from 'react';
import { Card, PageContainer } from '@tang/shared';

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
    const response = await api.get('/achievements');
    const next = response.data.achievements;
    setAchievements(next);
    if (next.some((item: Achievement) => item.unlocked)) {
      setMessage('🎉 有新的成就已解锁');
    }
  }

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">成就中心</h1>
          <p className="page-subtitle">把连续打卡、计划执行和周目标完成感具象化。</p>
        </div>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}

      <div className="stack">
        {achievements.map((achievement) => (
          <Card key={achievement.id} className="surface-card">
            <div className="table-like-row">
              <div>
                <strong>{achievement.name}</strong>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  {achievement.description}
                </p>
              </div>
              <span className={`pill ${achievement.unlocked ? 'status-ok' : 'status-warning'}`}>
                {achievement.unlocked ? '已解锁' : '未解锁'}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
