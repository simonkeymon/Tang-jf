import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, PageContainer } from '@tang/shared';

import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/error-handler';

type ProfileResponse = {
  goal: string;
  daily_calorie_target: number;
};

type PlanResponse = {
  id: string;
  goal: string;
  daily_calorie_target: number;
  duration_days: number;
};

type RecipePlanResponse = {
  meals: Array<{ id: string }>;
  total_calories: number;
  target_calories: number;
};

type SummaryResponse = {
  meal_completion_rate: number;
  streak: number;
};

type WeightEntry = {
  date: string;
  weight_kg: number;
};

export default function HomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [recipePlan, setRecipePlan] = useState<RecipePlanResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [streak, setStreak] = useState(0);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<'plan' | 'recipe' | 'summary' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadDashboard();
  }, []);

  const progressLabel = useMemo(() => {
    if (!profile) return '先完善资料';
    if (!plan) return '创建饮食计划';
    if (!recipePlan) return '生成今日食谱';
    if (!summary) return '生成今日总结';
    return '开始执行今日计划';
  }, [profile, plan, recipePlan, summary]);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    const today = new Date().toISOString().slice(0, 10);
    const from = getDateOffset(-6);

    const results = await Promise.allSettled([
      api.get('/user/profile'),
      api.get('/plan/current'),
      api.get('/recipe/today'),
      api.get('/summary/today'),
      api.get('/tracking/streak'),
      api.get('/tracking/weight', { params: { from, to: today } }),
    ]);

    const [profileResult, planResult, recipeResult, summaryResult, streakResult, weightResult] =
      results;

    setProfile(profileResult.status === 'fulfilled' ? profileResult.value.data.profile : null);
    setPlan(planResult.status === 'fulfilled' ? planResult.value.data.plan : null);
    setRecipePlan(
      recipeResult.status === 'fulfilled' ? recipeResult.value.data.recipePlan : null,
    );
    setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value.data.summary : null);
    setStreak(streakResult.status === 'fulfilled' ? streakResult.value.data.streak : 0);
    setLatestWeight(
      weightResult.status === 'fulfilled'
        ? getLatestWeight(weightResult.value.data.entries as WeightEntry[])
        : null,
    );
    setLoading(false);
  }

  async function handleGeneratePlan() {
    setWorking('plan');
    setError('');
    setMessage('');

    try {
      const response = await api.post('/plan/generate');
      setPlan(response.data.plan);
      setMessage('饮食计划已生成，接下来可以创建今日食谱。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorking(null);
    }
  }

  async function handleGenerateRecipe() {
    setWorking('recipe');
    setError('');
    setMessage('');

    try {
      const response = await api.post('/recipe/generate-daily', {
        date: new Date().toISOString().slice(0, 10),
      });
      setRecipePlan(response.data.recipePlan);
      setMessage('今日食谱已经准备好了。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorking(null);
    }
  }

  async function handleGenerateSummary() {
    setWorking('summary');
    setError('');
    setMessage('');

    try {
      const response = await api.post('/summary/generate', {
        date: new Date().toISOString().slice(0, 10),
      });
      setSummary(response.data.summary);
      setMessage('今日总结已生成。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorking(null);
    }
  }

  const nextAction = !profile ? (
    <Link to="/profile">
      <Button type="button">先完善资料</Button>
    </Link>
  ) : !plan ? (
    <Button type="button" onClick={handleGeneratePlan} disabled={working !== null}>
      {working === 'plan' ? '生成中...' : '一键生成计划'}
    </Button>
  ) : !recipePlan ? (
    <Button type="button" onClick={handleGenerateRecipe} disabled={working !== null}>
      {working === 'recipe' ? '生成中...' : '生成今日食谱'}
    </Button>
  ) : !summary ? (
    <Button type="button" onClick={handleGenerateSummary} disabled={working !== null}>
      {working === 'summary' ? '生成中...' : '生成今日总结'}
    </Button>
  ) : (
    <Link to="/tracking">
      <Button type="button">去打卡记录</Button>
    </Link>
  );

  return (
    <PageContainer>
      <section className="hero-card">
        <div className="hero-grid">
          <div className="stack">
            <span className="pill">欢迎回来 · {user?.email ?? 'Tang 用户'}</span>
            <h1 className="page-title">把“吃什么”变成每天都能执行的计划。</h1>
            <p style={{ margin: 0, opacity: 0.92 }}>
              我已经补强了登录/注册、会话保持和首页引导。现在核心体验围绕资料、计划、
              今日食谱、打卡与总结形成闭环。
            </p>
            <div className="button-row">{nextAction}</div>
          </div>

          <div className="surface-card" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}>
            <p className="metric-label" style={{ color: 'rgba(255,255,255,0.8)' }}>
              当前建议动作
            </p>
            <p className="metric-value">{progressLabel}</p>
            <p style={{ marginBottom: 0, opacity: 0.92 }}>
              {profile
                ? `目标方向：${translateGoal(profile.goal)}`
                : '先填写基础信息，让系统给出热量与目标建议。'}
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <div className="page-header">
          <div>
            <h2 className="page-title" style={{ fontSize: '1.8rem' }}>
              今日总览
            </h2>
            <p className="page-subtitle">用最少步骤看清今天离目标还有多远。</p>
          </div>
        </div>

        {error ? <div className="banner banner-error">{error}</div> : null}
        {message ? <div className="banner banner-success">{message}</div> : null}

        <div className="stats-grid">
          <Card className="surface-card">
            <p className="metric-label">连续打卡</p>
            <p className="metric-value">{streak} 天</p>
            <p className="muted">至少完成 2 餐打卡即可累计连续记录。</p>
          </Card>
          <Card className="surface-card">
            <p className="metric-label">今日热量</p>
            <p className="metric-value">{recipePlan?.total_calories ?? 0} kcal</p>
            <p className="muted">目标 {recipePlan?.target_calories ?? profile?.daily_calorie_target ?? 0} kcal</p>
          </Card>
          <Card className="surface-card">
            <p className="metric-label">最新体重</p>
            <p className="metric-value">{latestWeight ? `${latestWeight} kg` : '--'}</p>
            <p className="muted">最近 7 天的最新记录。</p>
          </Card>
          <Card className="surface-card">
            <p className="metric-label">今日完成率</p>
            <p className="metric-value">
              {summary ? `${Math.round(summary.meal_completion_rate * 100)}%` : '--'}
            </p>
            <p className="muted">来自食谱打卡与总结结果。</p>
          </Card>
        </div>
      </section>

      <section style={{ marginTop: 24 }} className="content-grid">
        <Card className="surface-card">
          <h3>完成你的 MVP 闭环</h3>
          <div className="stack">
            <TaskItem done={Boolean(profile)} title="完善个人资料" description="计算热量目标和饮食方向。" />
            <TaskItem done={Boolean(plan)} title="生成饮食计划" description="锁定 30 天执行目标和宏量比例。" />
            <TaskItem done={Boolean(recipePlan)} title="安排今日食谱" description="形成早餐、午餐、晚餐与加餐。" />
            <TaskItem done={Boolean(summary)} title="拿到今日总结" description="获得 AI 反馈和明日预告。" />
          </div>
        </Card>

        <Card className="surface-card">
          <h3>快速入口</h3>
          <div className="quick-grid">
            <QuickLink to="/profile" title="完善资料" description="补充身高、体重、目标与饮食偏好" />
            <QuickLink to="/plan" title="饮食计划" description="查看/生成你的长期计划" />
            <QuickLink to="/recipe/today" title="今日食谱" description="查看、替换或收藏餐食" />
            <QuickLink
              to="/food-analysis"
              title="拍照识别热量"
              description="上传一张食物照片，快速估算食物组成与总热量"
            />
            <QuickLink to="/tracking" title="记录中心" description="登记体重并完成打卡" />
            <QuickLink to="/summary/today" title="今日总结" description="查看执行率和 AI 反馈" />
            <QuickLink to="/shopping" title="购物清单" description="生成一周食材采购列表" />
          </div>
        </Card>
      </section>

      <section style={{ marginTop: 24 }} className="content-grid">
        <Card className="surface-card">
          <h3>计划状态</h3>
          {!plan ? (
            <div className="empty-state">
              <p>你还没有活跃计划。</p>
              <p className="muted">补齐资料后即可一键生成。</p>
            </div>
          ) : (
            <div className="stack">
              <div className="table-like-row">
                <strong>目标</strong>
                <span>{translateGoal(plan.goal)}</span>
              </div>
              <div className="table-like-row">
                <strong>每日热量</strong>
                <span>{plan.daily_calorie_target} kcal</span>
              </div>
              <div className="table-like-row">
                <strong>计划周期</strong>
                <span>{plan.duration_days} 天</span>
              </div>
              <Link to="/plan">
                <Button type="button" variant="secondary">
                  打开完整计划
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <Card className="surface-card">
          <h3>今日食谱状态</h3>
          {!recipePlan ? (
            <div className="empty-state">
              <p>还没有今日食谱。</p>
              <p className="muted">计划准备好后，可为今天自动安排三餐。</p>
            </div>
          ) : (
            <div className="stack">
              <div className="table-like-row">
                <strong>餐次数量</strong>
                <span>{recipePlan.meals.length} 份</span>
              </div>
              <div className="table-like-row">
                <strong>总热量</strong>
                <span>{recipePlan.total_calories} kcal</span>
              </div>
              <div className="progress-bar" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (recipePlan.total_calories / Math.max(1, recipePlan.target_calories)) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
              <Link to="/recipe/today">
                <Button type="button" variant="secondary">
                  查看今日食谱
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </section>

      <section style={{ marginTop: 24 }}>
        <Card className="surface-card">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>AI 拍照识别热量</h3>
              <p className="page-subtitle" style={{ marginTop: 8 }}>
                这是产品计划里的核心能力之一：拍照上传食物，调用 AI Vision 做热量估算。
              </p>
            </div>
            <Link to="/food-analysis">
              <Button type="button" variant="secondary">
                立即去拍照分析
              </Button>
            </Link>
          </div>
          <div className="stats-grid">
            <div className="surface-card">
              <p className="metric-label">适用场景</p>
              <p className="metric-value" style={{ fontSize: '1.15rem' }}>
                外卖 / 外食 / 自做饭
              </p>
            </div>
            <div className="surface-card">
              <p className="metric-label">当前能力</p>
              <p className="metric-value" style={{ fontSize: '1.15rem' }}>
                食物识别 + 热量估算
              </p>
            </div>
            <div className="surface-card">
              <p className="metric-label">入口位置</p>
              <p className="metric-value" style={{ fontSize: '1.15rem' }}>
                首页 + 底部导航
              </p>
            </div>
          </div>
        </Card>
      </section>

      {loading ? <p className="muted">正在同步首页数据...</p> : null}
    </PageContainer>
  );
}

function TaskItem({
  done,
  title,
  description,
}: {
  done: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="table-like-row">
      <div>
        <strong>{title}</strong>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          {description}
        </p>
      </div>
      <span className={`pill ${done ? 'status-ok' : 'status-warning'}`}>{done ? '已完成' : '待完成'}</span>
    </div>
  );
}

function QuickLink({
  to,
  title,
  description,
}: {
  to: string;
  title: string;
  description: string;
}) {
  return (
    <Link to={to}>
      <div className="surface-card" style={{ height: '100%' }}>
        <strong>{title}</strong>
        <p className="muted" style={{ marginBottom: 0, marginTop: 8 }}>
          {description}
        </p>
      </div>
    </Link>
  );
}

function translateGoal(goal: string) {
  if (goal === 'lose') return '减脂';
  if (goal === 'gain') return '增肌';
  return '维持体型';
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getLatestWeight(entries: WeightEntry[]): number | null {
  if (entries.length === 0) {
    return null;
  }

  return entries[entries.length - 1]?.weight_kg ?? null;
}
