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
    <PageContainer className="page-stack">
      <section className="hero-card home-hero">
        <div className="hero-grid home-hero-grid">
          <div className="stack home-hero-copy">
            <span className="eyebrow eyebrow-on-dark">今日执行概览</span>
            <div className="pill-row">
              <span className="pill">欢迎回来 · {user?.email ?? 'Tang 用户'}</span>
              {profile ? <span className="pill">目标：{translateGoal(profile.goal)}</span> : null}
            </div>
            <h1 className="page-title">把“吃什么”变成每天都能执行的计划。</h1>
            <p className="hero-copy">
              让资料、计划、食谱、打卡与总结在同一条节奏里工作。你不需要在多个页面之间来回拼装，
              今天该做什么、离目标还有多远，都在一个视图里说清楚。
            </p>
            <div className="hero-actions">
              {nextAction}
              <Link to="/recipe/today">
                <Button type="button" variant="secondary">
                  查看今日食谱
                </Button>
              </Link>
            </div>
          </div>

          <div className="surface-card callout-card home-hero-rail">
            <span className="eyebrow eyebrow-on-dark">执行节奏</span>
            <p className="metric-label" style={{ color: 'rgba(255,255,255,0.78)' }}>
              当前建议动作
            </p>
            <p className="metric-value">{progressLabel}</p>
            <p className="hero-copy hero-copy-sm">
              {profile
                ? `目标方向：${translateGoal(profile.goal)}，系统会把热量、计划与食谱安排衔接成一条流。`
                : '先填写基础信息，让系统给出热量建议，再开始今天的执行闭环。'}
            </p>
            <div className="hero-stat-grid">
              <HeroStat label="连续记录" value={`${streak}天`} />
              <HeroStat
                label="今日热量"
                value={`${recipePlan?.total_calories ?? profile?.daily_calorie_target ?? 0} kcal`}
              />
              <HeroStat
                label="完成率"
                value={summary ? `${Math.round(summary.meal_completion_rate * 100)}%` : '--'}
              />
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {message ? <div className="banner banner-success">{message}</div> : null}

      <section className="section-shell">
        <div className="section-intro">
          <span className="eyebrow">今日总览</span>
          <h2 className="section-title">用一眼能读懂的密度安排今天。</h2>
          <p className="page-subtitle">把关键结果压缩成少量卡片，再把下一步放在最显眼的位置。</p>
        </div>

        <div className="stats-grid">
          <MetricCard
            label="连续打卡"
            value={`${streak} 天`}
            hint="至少完成 2 餐打卡即可累计连续记录。"
          />
          <MetricCard
            label="今日热量"
            value={`${recipePlan?.total_calories ?? 0} kcal`}
            hint={`目标 ${recipePlan?.target_calories ?? profile?.daily_calorie_target ?? 0} kcal`}
          />
          <MetricCard
            label="最新体重"
            value={latestWeight ? `${latestWeight} kg` : '--'}
            hint="最近 7 天的最新记录。"
          />
          <MetricCard
            label="今日完成率"
            value={summary ? `${Math.round(summary.meal_completion_rate * 100)}%` : '--'}
            hint="来自食谱打卡与总结结果。"
          />
        </div>
        {loading ? <p className="muted home-loading">正在同步首页数据...</p> : null}
      </section>

      <section className="section-card-grid">
        <Card className="surface-card surface-subtle">
          <div className="section-intro">
            <span className="eyebrow">执行闭环</span>
            <h3>按顺序完成今天的关键节点。</h3>
          </div>
          <div className="stack">
            <TaskItem done={Boolean(profile)} title="完善个人资料" description="计算热量目标和饮食方向。" />
            <TaskItem done={Boolean(plan)} title="生成饮食计划" description="锁定 30 天执行目标和宏量比例。" />
            <TaskItem done={Boolean(recipePlan)} title="安排今日食谱" description="形成早餐、午餐、晚餐与加餐。" />
            <TaskItem done={Boolean(summary)} title="拿到今日总结" description="获得 AI 反馈和明日预告。" />
          </div>
        </Card>

        <Card className="surface-card">
          <div className="section-intro">
            <span className="eyebrow">快速入口</span>
            <h3>把高频操作集中在一个面板里。</h3>
          </div>
          <div className="quick-grid">
            <QuickLink to="/profile" title="完善资料" description="补充身高、体重、目标与饮食偏好" />
            <QuickLink to="/plan" title="饮食计划" description="查看或生成你的长期执行策略" />
            <QuickLink to="/recipe/today" title="今日食谱" description="查看、替换或收藏今天的餐食" />
            <QuickLink
              to="/food-analysis"
              title="拍照识别热量"
              description="上传食物照片，快速估算组成与热量"
            />
            <QuickLink to="/tracking" title="记录中心" description="登记体重并完成早餐到加餐的打卡" />
            <QuickLink to="/summary/today" title="今日总结" description="查看执行率、反馈与明日预告" />
            <QuickLink to="/shopping" title="购物清单" description="根据食谱生成一周采购列表" />
          </div>
        </Card>
      </section>

      <section className="section-card-grid">
        <Card className="surface-card surface-subtle">
          <div className="section-intro">
            <span className="eyebrow">计划状态</span>
            <h3>长期目标是否已经准备就绪。</h3>
          </div>
          {!plan ? (
            <div className="empty-state">
              <p>你还没有活跃计划。</p>
              <p className="muted">补齐资料后即可一键生成。</p>
            </div>
          ) : (
            <div className="detail-list">
              <InfoRow label="目标" value={translateGoal(plan.goal)} />
              <InfoRow label="每日热量" value={`${plan.daily_calorie_target} kcal`} />
              <InfoRow label="计划周期" value={`${plan.duration_days} 天`} />
              <Link to="/plan">
                <Button type="button" variant="secondary">
                  打开完整计划
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <Card className="surface-card">
          <div className="section-intro">
            <span className="eyebrow">今日食谱状态</span>
            <h3>今天的吃法是否已经排好。</h3>
          </div>
          {!recipePlan ? (
            <div className="empty-state">
              <p>还没有今日食谱。</p>
              <p className="muted">计划准备好后，可为今天自动安排三餐。</p>
            </div>
          ) : (
            <div className="detail-list">
              <InfoRow label="餐次数量" value={`${recipePlan.meals.length} 份`} />
              <InfoRow label="总热量" value={`${recipePlan.total_calories} kcal`} />
              <div className="stack" style={{ gap: 10 }}>
                <p className="metric-label">与目标热量的贴合度</p>
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

      <section className="section-shell">
        <Card className="surface-card feature-spotlight">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div className="section-intro">
              <span className="eyebrow">拍照识别</span>
              <h3>把拍照识别热量变成首页上的自然入口。</h3>
              <p className="page-subtitle">
                外卖、外食或自做饭时，不必先想记录方式，直接拍一张图就能进入估算流程。
              </p>
            </div>
            <Link to="/food-analysis">
              <Button type="button" variant="secondary">
                立即去拍照分析
              </Button>
            </Link>
          </div>
          <div className="stats-grid">
            <MetricCard label="适用场景" value="外卖 / 外食 / 自做饭" hint="把不规则饮食也纳入每日记录。" />
            <MetricCard label="识别能力" value="食物识别 + 热量估算" hint="支持快速查看食物组成与总热量。" />
            <MetricCard label="入口位置" value="首页 + 底部导航" hint="需要时始终在最顺手的位置。" />
          </div>
        </Card>
      </section>
    </PageContainer>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hero-stat">
      <span className="hero-stat-label">{label}</span>
      <p className="hero-stat-value">{value}</p>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="surface-card metric-card surface-subtle">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="muted" style={{ margin: 0 }}>
        {hint}
      </p>
    </Card>
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
      <div className="surface-card quick-link-card">
        <strong>{title}</strong>
        <p className="muted" style={{ margin: 0 }}>
          {description}
        </p>
      </div>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="table-like-row">
      <strong>{label}</strong>
      <span className="detail-value">{value}</span>
    </div>
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
