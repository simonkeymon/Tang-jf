import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Card, Input, PageContainer } from '@tang/shared';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002/api';

type UserSummary = {
  id: string;
  email: string;
  hasPlan: boolean;
  streak: number;
};

type Stats = {
  totalUsers: number;
  activeToday: number;
  plansCreated: number;
  platformAiConfigured: boolean;
};

type PlatformAIConfig = {
  base_url: string;
  api_key: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_custom: boolean;
};

export default function App() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [token, setToken] = useState(() => localStorage.getItem('adminToken') ?? '');
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [platformAI, setPlatformAI] = useState<PlatformAIConfig>({
    base_url: 'https://api.openai.com/v1',
    api_key: '',
    model: 'gpt-4o',
    temperature: 0.2,
    max_tokens: 512,
    is_custom: false,
  });
  const [maskedPlatformKey, setMaskedPlatformKey] = useState<string | null>(null);

  useEffect(() => {
    void loadBootstrapStatus().then((bootstrapRequired) => {
      if (!bootstrapRequired && token) {
        void loadAdminData(token);
      }
    });
  }, []);

  async function loadBootstrapStatus() {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/admin-bootstrap/status`);
      const payload = await response.json();
      setNeedsBootstrap(Boolean(payload.needsBootstrap));
      return Boolean(payload.needsBootstrap);
    } catch {
      setNeedsBootstrap(false);
      return false;
    }
  }

  async function handleBootstrapRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/auth/admin-bootstrap/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? '初始化管理员失败');
      }

      localStorage.setItem('adminToken', payload.accessToken);
      setToken(payload.accessToken);
      setNeedsBootstrap(false);
      setConfirmPassword('');
      setMessage('首个管理员已创建并自动登录。');
      await loadAdminData(payload.accessToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '初始化管理员失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? '登录失败');
      }

      localStorage.setItem('adminToken', payload.accessToken);
      setToken(payload.accessToken);
      setMessage('管理员登录成功。');
      await loadAdminData(payload.accessToken);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '管理员登录失败');
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminData(currentToken = token) {
    if (!currentToken.trim()) {
      setError('请先登录管理员账号。');
      setStats(null);
      setUsers([]);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${currentToken}` };
      const [usersRes, statsRes, aiRes] = await Promise.all([
        fetch(`${apiBaseUrl}/admin/users`, { headers }),
        fetch(`${apiBaseUrl}/admin/dashboard`, { headers }),
        fetch(`${apiBaseUrl}/admin/ai/config`, { headers }),
      ]);

      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      const aiData = aiRes.ok ? await aiRes.json() : null;

      if (!usersRes.ok || !statsRes.ok) {
        throw new Error(usersData.message ?? statsData.message ?? '当前账号没有管理员权限。');
      }

      setUsers(usersData.users ?? []);
      setStats(statsData.stats ?? null);
      if (aiData?.config) {
        setPlatformAI({
          ...aiData.config,
          api_key: '',
        });
        setMaskedPlatformKey(aiData.config.api_key ?? null);
      }
      setMessage('后台数据已刷新。');
      localStorage.setItem('adminToken', currentToken);
    } catch (requestError) {
      setUsers([]);
      setStats(null);
      setError(requestError instanceof Error ? requestError.message : '加载后台数据失败');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('adminToken');
    setToken('');
    setUsers([]);
    setStats(null);
    setMessage('已退出后台。');
    setError('');
  }

  async function handleSavePlatformAI(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError('请先登录管理员账号。');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/admin/ai/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...platformAI,
          api_key: platformAI.api_key,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? '保存平台 AI 配置失败');
      }

      setPlatformAI({ ...payload.config, api_key: '' });
      setMaskedPlatformKey(payload.config.api_key ?? null);
      setMessage('平台 AI 配置已保存。');
      await loadAdminData(token);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '保存平台 AI 配置失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer className="admin-shell">
      <header className="page-header">
        <div>
          <h1 className="page-title">Tang Admin Dashboard</h1>
          <p className="page-subtitle">
            使用管理员账号登录后查看用户概览、计划统计与平台 AI 配置状态。
          </p>
        </div>
        <div className="pill-row">
          <span className={`pill ${token ? 'status-ok' : 'status-warning'}`}>
            {token ? '后台已连接' : '等待登录'}
          </span>
          {token ? (
            <Button type="button" variant="ghost" onClick={handleLogout}>
              退出后台
            </Button>
          ) : null}
        </div>
      </header>

      <section className="content-grid admin-auth-grid">
        <Card className="surface-card admin-hero">
          <span className="pill">Tang 管理面板</span>
          <h2>{needsBootstrap ? '初始化首个管理员' : '管理总览'}</h2>
          <p className="page-subtitle">
            {needsBootstrap
              ? '首次进入后台时，请先创建管理员账号。首个注册的账号会自动成为管理员。'
              : '登录后可管理平台 AI 默认配置，并查看用户与计划概览。'}
          </p>
          <ul className="auth-list">
            <li>统一平台默认 AI 配置，作为普通用户未配置自定义模型时的回退来源。</li>
            <li>快速查看用户 streak、计划覆盖情况与今日活跃表现。</li>
            <li>统一查看用户状态、计划覆盖与平台模型配置。</li>
          </ul>
        </Card>

        <Card className="surface-card">
          <h2>{needsBootstrap ? '创建管理员账号' : '管理员登录'}</h2>
          <p className="admin-note">
            {needsBootstrap
              ? '创建完成后会自动登录并拉取后台数据。'
              : '管理员登录后可刷新数据、管理平台 AI，以及查看当前用户状态。'}
          </p>

          <form className="form-grid" onSubmit={needsBootstrap ? handleBootstrapRegister : handleLogin}>
            <label className="field">
              <span className="field-label">管理员邮箱</span>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="管理员邮箱"
                type="email"
              />
            </label>

            <label className="field">
              <span className="field-label">密码</span>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="密码"
              />
            </label>

            {needsBootstrap ? (
              <label className="field">
                <span className="field-label">确认密码</span>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="确认密码"
                />
              </label>
            ) : null}

            <div className="admin-form-actions">
              <Button type="submit" disabled={loading}>
                {loading ? '处理中...' : needsBootstrap ? '创建管理员并进入后台' : '登录后台'}
              </Button>
              {!needsBootstrap && token ? (
                <Button type="button" variant="secondary" onClick={() => void loadAdminData()}>
                  刷新数据
                </Button>
              ) : null}
            </div>
          </form>
        </Card>
      </section>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      {stats ? (
        <>
          <section className="stats-grid" style={{ marginBottom: 24 }}>
            <Metric label="总用户数" value={String(stats.totalUsers)} />
            <Metric label="今日活跃" value={String(stats.activeToday)} />
            <Metric label="计划总数" value={String(stats.plansCreated)} />
            <Metric label="平台 AI 已配置" value={stats.platformAiConfigured ? '是' : '否'} />
          </section>

          <div className="content-grid">
            <Card className="surface-card" style={{ gridColumn: '1 / -1' }}>
              <div className="page-header" style={{ marginBottom: 0 }}>
                <div>
                  <h2>用户列表</h2>
                  <p className="page-subtitle">快速查看用户邮箱、连续记录情况与是否已生成计划。</p>
                </div>
              </div>
              {users.length === 0 ? (
                <p className="muted">当前还没有用户数据。</p>
              ) : (
                <ul className="list-reset">
                  {users.map((user) => (
                    <li key={user.id} className="table-like-row admin-user-row">
                      <span>{user.email}</span>
                      <span className="admin-user-meta">
                        streak {user.streak} · {user.hasPlan ? '有计划' : '无计划'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="surface-card" style={{ gridColumn: '1 / -1' }}>
              <div className="page-header" style={{ marginBottom: 0 }}>
                <div>
                  <h2>平台 AI 配置</h2>
                  <p className="page-subtitle">
                    当普通用户未设置自己的 AI 时，系统会回退使用这里的全局平台配置。
                  </p>
                </div>
                <span className={`pill ${stats.platformAiConfigured ? 'status-ok' : 'status-warning'}`}>
                  {stats.platformAiConfigured ? '已配置' : '未配置'}
                </span>
              </div>

              <form className="form-grid" onSubmit={handleSavePlatformAI}>
                <label className="field">
                  <span className="field-label">Base URL</span>
                  <Input
                    value={platformAI.base_url}
                    onChange={(event) =>
                      setPlatformAI((current) => ({ ...current, base_url: event.target.value }))
                    }
                    placeholder="Base URL"
                  />
                </label>

                <label className="field">
                  <span className="field-label">模型名</span>
                  <Input
                    value={platformAI.model}
                    onChange={(event) =>
                      setPlatformAI((current) => ({ ...current, model: event.target.value }))
                    }
                    placeholder="模型名"
                  />
                </label>

                <label className="field">
                  <span className="field-label">平台 API Key</span>
                  <Input
                    type="password"
                    value={platformAI.api_key}
                    onChange={(event) =>
                      setPlatformAI((current) => ({ ...current, api_key: event.target.value }))
                    }
                    placeholder={maskedPlatformKey ? '留空则保留已保存的 Key' : '输入平台 API Key'}
                  />
                  {maskedPlatformKey ? (
                    <p className="field-hint">当前已保存 Key：{maskedPlatformKey}</p>
                  ) : null}
                </label>

                <div className="admin-inline-grid">
                  <label className="field">
                    <span className="field-label">temperature</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={platformAI.temperature}
                      onChange={(event) =>
                        setPlatformAI((current) => ({
                          ...current,
                          temperature: Number(event.target.value),
                        }))
                      }
                      placeholder="temperature"
                    />
                  </label>

                  <label className="field">
                    <span className="field-label">max tokens</span>
                    <Input
                      type="number"
                      value={platformAI.max_tokens}
                      onChange={(event) =>
                        setPlatformAI((current) => ({
                          ...current,
                          max_tokens: Number(event.target.value),
                        }))
                      }
                      placeholder="max tokens"
                    />
                  </label>
                </div>

                <label className="admin-checkbox-row">
                  <input
                    type="checkbox"
                    checked={platformAI.is_custom}
                    onChange={(event) =>
                      setPlatformAI((current) => ({ ...current, is_custom: event.target.checked }))
                    }
                  />
                  标记为自定义平台 AI
                </label>

                <div className="admin-form-actions">
                  <Button type="submit" disabled={loading}>
                    {loading ? '保存中...' : '保存平台 AI'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="surface-card metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </Card>
  );
}
