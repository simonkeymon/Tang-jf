import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Input } from '@tang/shared';

import { AuthShell } from '../../components/AuthShell';
import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'request' | 'reset' | null>(null);

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading('request');
    setError('');
    setMessage('');

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setToken(response.data.resetToken ?? '');
      setMessage(
        response.data.resetToken
          ? `已生成重置 token：${response.data.resetToken}`
          : '如果该邮箱存在，系统已创建重置凭证。',
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(null);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading('reset');
    setError('');

    try {
      await api.post('/auth/reset-password', { token, password });
      setMessage('密码已重置，请返回登录页重新登录。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(null);
    }
  }

  return (
    <AuthShell
      title="找回密码"
      subtitle="当前版本提供开发态可用的密码重置流程：先申请 token，再提交新密码完成重置。"
      footer={
        <p className="muted">
          已想起密码？ <Link to="/login">回到登录页</Link>
        </p>
      }
    >
      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <form className="form-grid" onSubmit={handleRequestReset}>
        <h2 style={{ margin: 0 }}>第一步：申请重置 token</h2>
        <label className="field">
          <span className="field-label">邮箱</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <Button type="submit" disabled={loading !== null}>
          {loading === 'request' ? '提交中...' : '发送重置请求'}
        </Button>
      </form>

      <form className="form-grid" onSubmit={handleResetPassword}>
        <h2 style={{ margin: 0 }}>第二步：设置新密码</h2>
        <label className="field">
          <span className="field-label">重置 token</span>
          <Input
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="开发环境会直接返回 token"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">新密码</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 8 位"
            required
            minLength={8}
          />
        </label>
        <Button type="submit" variant="secondary" disabled={loading !== null}>
          {loading === 'reset' ? '重置中...' : '重置密码'}
        </Button>
      </form>
    </AuthShell>
  );
}
