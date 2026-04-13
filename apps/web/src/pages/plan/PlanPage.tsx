import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { BottomNav } from '../../components/BottomNav';
import { Button, Card, PageContainer, useTranslation } from '@tang/shared';

interface Plan {
  id: string;
  goal: string;
  daily_calorie_target: number;
  duration_days: number;
  macro_ratio: {
    protein: number;
    carbohydrate: number;
    fat: number;
  };
}

export default function PlanPage() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/plan/current');
      setPlan(res.data.plan);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setPlan(null);
      } else {
        setError(err.response?.data?.message || '获取计划失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const res = await api.post('/plan/generate');
      setPlan(res.data.plan);
    } catch (err: any) {
      setError(err.response?.data?.message || '生成计划失败');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>加载中...</div>;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <PageContainer>
        <h1>{t('plan.title')}</h1>

        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        {!plan ? (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <h2>您还没有饮食计划</h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              创建一个专属的AI饮食计划，帮助您更好地达成目标。
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              style={{ fontSize: '1.1rem', opacity: generating ? 0.7 : 1 }}
            >
              {generating ? '正在为您生成专属计划...' : '创建饮食计划'}
            </Button>
          </div>
        ) : (
          <div>
            <Card style={{ backgroundColor: '#f9f9f9', marginBottom: '2rem' }}>
              <h2 style={{ marginTop: 0 }}>计划总览</h2>
              <ul style={{ listStyle: 'none', padding: 0, lineHeight: '1.8' }}>
                <li>
                  <strong>目标:</strong> {plan.goal}
                </li>
                <li>
                  <strong>每日卡路里目标:</strong> {plan.daily_calorie_target} kcal
                </li>
                <li>
                  <strong>计划周期:</strong> {plan.duration_days} 天
                </li>
                <li>
                  <strong>营养元素比例 (碳水:蛋白:脂肪):</strong> {plan.macro_ratio.carbohydrate}% :{' '}
                  {plan.macro_ratio.protein}% : {plan.macro_ratio.fat}%
                </li>
              </ul>
            </Card>

            <Card>
              <h3 style={{ marginTop: 0 }}>今日进度</h3>
              <div
                style={{
                  height: '20px',
                  backgroundColor: '#eee',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: '0%', height: '100%', backgroundColor: '#0070f3' }}></div>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                今天还没有记录饮食，快去记录吧！
              </p>
            </Card>
          </div>
        )}
      </PageContainer>

      <BottomNav />
    </div>
  );
}
