import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Input } from '@tang/shared';

import { AuthShell } from '../../components/AuthShell';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/error-handler';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await login({ email, password });
      navigate('/');
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="登录继续你的饮食计划"
      subtitle="修复了浏览器跨域鉴权后，你现在可以直接注册、登录并保持会话。"
      footer={
        <p className="muted">
          还没有账号？ <Link to="/register">立即注册</Link> ·{' '}
          <Link to="/forgot-password">忘记密码</Link>
        </p>
      }
    >
      <div>
        <h2 style={{ margin: 0 }}>欢迎回来</h2>
        <p className="page-subtitle" style={{ marginTop: 8 }}>
          登录后可以继续查看饮食计划、今日食谱与打卡进度。
        </p>
      </div>

      {error ? <div className="banner banner-error">{error}</div> : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">邮箱</span>
          <Input
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">密码</span>
          <Input
            name="password"
            type="password"
            placeholder="至少 8 位"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>

        <Button type="submit" disabled={submitting}>
          {submitting ? '登录中...' : '邮箱登录'}
        </Button>
      </form>
    </AuthShell>
  );
}
