import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { BottomNav } from '../../components/BottomNav';
import { useTranslation } from '@tang/shared';

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
      <main style={{ padding: '2rem', paddingBottom: '6rem' }}>
        <h1>{t('plan.title')}</h1>

        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

        {!plan ? (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <h2>您还没有饮食计划</h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              创建一个专属的AI饮食计划，帮助您更好地达成目标。
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: '0.8rem 2rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1.1rem',
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.7 : 1,
              }}
            >
              {generating ? '正在为您生成专属计划...' : '创建饮食计划'}
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                marginBottom: '2rem',
              }}
            >
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
            </div>

            <div
              style={{
                padding: '1.5rem',
                border: '1px solid #eee',
                borderRadius: '8px',
              }}
            >
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
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
