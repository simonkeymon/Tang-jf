import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button, Input } from '@tang/shared';

import { AuthShell } from '../../components/AuthShell';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/error-handler';

export default function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await register({ email, password });
      navigate('/');
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="创建你的专属健康账号"
      subtitle="完成注册后会直接进入首页，引导你补齐资料、生成计划并开始打卡。"
      footer={
        <p className="muted">
          已有账号？ <Link to="/login">去登录</Link>
        </p>
      }
    >
      <div>
        <h2 style={{ margin: 0 }}>开启 7 天可见变化的饮食节奏</h2>
        <p className="page-subtitle" style={{ marginTop: 8 }}>
          当前版本聚焦 MVP 核心闭环：资料 → 计划 → 食谱 → 打卡 → 总结。
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>

        <label className="field">
          <span className="field-label">确认密码</span>
          <Input
            name="confirm-password"
            type="password"
            placeholder="再次输入密码"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
        </label>

        <Button type="submit" disabled={submitting}>
          {submitting ? '注册中...' : '邮箱注册'}
        </Button>
      </form>
    </AuthShell>
  );
}
