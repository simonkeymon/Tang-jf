import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';

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
    <main
      style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: 24,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        color: '#172033',
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Tang Admin Dashboard</h1>
        <p style={{ color: '#5f6d87', margin: 0 }}>
          使用管理员账号登录后查看用户概览、计划统计与平台 AI 配置状态。
        </p>
      </header>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>{needsBootstrap ? '初始化首个管理员' : '管理员登录'}</h2>
        <p style={{ color: '#5f6d87' }}>
          {needsBootstrap
            ? '首次进入后台时，请先创建管理员账号。首个注册的账号会自动成为管理员。'
            : '请输入管理员账号密码登录后台。'}
        </p>

        <form
          style={{ display: 'grid', gap: 12 }}
          onSubmit={needsBootstrap ? handleBootstrapRegister : handleLogin}
        >
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="管理员邮箱"
            style={inputStyle}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="密码"
            style={inputStyle}
          />
          {needsBootstrap ? (
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="确认密码"
              style={inputStyle}
            />
          ) : null}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? '处理中...' : needsBootstrap ? '创建管理员并进入后台' : '登录后台'}
            </button>
            {!needsBootstrap && token ? (
              <>
                <button
                  type="button"
                  onClick={() => void loadAdminData()}
                  style={secondaryButtonStyle}
                >
                  刷新数据
                </button>
                <button type="button" onClick={handleLogout} style={secondaryButtonStyle}>
                  退出后台
                </button>
              </>
            ) : null}
          </div>
        </form>
      </section>

      {message ? (
        <div style={{ ...bannerStyle, background: 'rgba(220,252,231,0.95)', color: '#15803d' }}>
          {message}
        </div>
      ) : null}
      {error ? (
        <div style={{ ...bannerStyle, background: 'rgba(254,226,226,0.95)', color: '#b91c1c' }}>
          {error}
        </div>
      ) : null}

      {stats ? (
        <>
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <Metric label="总用户数" value={String(stats.totalUsers)} />
            <Metric label="今日活跃" value={String(stats.activeToday)} />
            <Metric label="计划总数" value={String(stats.plansCreated)} />
            <Metric label="平台 AI 已配置" value={stats.platformAiConfigured ? '是' : '否'} />
          </section>

          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>用户列表</h2>
            {users.length === 0 ? (
              <p style={{ color: '#5f6d87' }}>当前还没有用户数据。</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {users.map((user) => (
                  <li
                    key={user.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: '1px solid rgba(130,149,191,0.16)',
                    }}
                  >
                    <span>{user.email}</span>
                    <span>
                      streak {user.streak} · {user.hasPlan ? '有计划' : '无计划'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section style={panelStyle}>
            <h2 style={{ marginTop: 0 }}>平台 AI 配置</h2>
            <p style={{ color: '#5f6d87' }}>
              当普通用户未设置自己的 AI 时，系统会回退使用这里的全局平台配置。
            </p>
            <form style={{ display: 'grid', gap: 12 }} onSubmit={handleSavePlatformAI}>
              <input
                value={platformAI.base_url}
                onChange={(event) =>
                  setPlatformAI((current) => ({ ...current, base_url: event.target.value }))
                }
                placeholder="Base URL"
                style={inputStyle}
              />
              <input
                value={platformAI.model}
                onChange={(event) =>
                  setPlatformAI((current) => ({ ...current, model: event.target.value }))
                }
                placeholder="模型名"
                style={inputStyle}
              />
              <input
                type="password"
                value={platformAI.api_key}
                onChange={(event) =>
                  setPlatformAI((current) => ({ ...current, api_key: event.target.value }))
                }
                placeholder={maskedPlatformKey ? '留空则保留已保存的 Key' : '输入平台 API Key'}
                style={inputStyle}
              />
              {maskedPlatformKey ? (
                <p style={{ color: '#5f6d87', margin: 0 }}>当前已保存 Key：{maskedPlatformKey}</p>
              ) : null}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input
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
                  style={inputStyle}
                />
                <input
                  type="number"
                  value={platformAI.max_tokens}
                  onChange={(event) =>
                    setPlatformAI((current) => ({
                      ...current,
                      max_tokens: Number(event.target.value),
                    }))
                  }
                  placeholder="max tokens"
                  style={inputStyle}
                />
              </div>
              <label style={{ color: '#5f6d87' }}>
                <input
                  type="checkbox"
                  checked={platformAI.is_custom}
                  onChange={(event) =>
                    setPlatformAI((current) => ({ ...current, is_custom: event.target.checked }))
                  }
                />{' '}
                标记为自定义平台 AI
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" disabled={loading} style={buttonStyle}>
                  {loading ? '保存中...' : '保存平台 AI'}
                </button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={panelStyle}>
      <p style={{ margin: '0 0 8px', color: '#5f6d87' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{value}</p>
    </div>
  );
}

const panelStyle: CSSProperties = {
  border: '1px solid rgba(130,149,191,0.2)',
  borderRadius: 20,
  padding: 20,
  background: '#fff',
  boxShadow: '0 14px 38px rgba(37,54,88,0.08)',
  marginBottom: 24,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: 12,
  borderRadius: 14,
  border: '1px solid rgba(130,149,191,0.24)',
  background: 'rgba(248,250,255,0.96)',
};

const buttonStyle: CSSProperties = {
  padding: '0.8rem 1.25rem',
  borderRadius: 14,
  cursor: 'pointer',
  fontWeight: 600,
  background: 'linear-gradient(135deg, rgba(39,81,219,1), rgba(79,125,255,0.95))',
  color: '#fff',
  border: 'none',
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: '#e9efff',
  color: '#2751db',
  border: '1px solid rgba(39,81,219,0.16)',
};

const bannerStyle: CSSProperties = {
  marginBottom: 16,
  padding: 14,
  borderRadius: 16,
};
