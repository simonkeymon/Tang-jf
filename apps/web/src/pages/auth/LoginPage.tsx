import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      await login({ email, password });
      navigate('/');
    } catch {
      setError('登录失败');
    }
  }

  return (
    <main>
      <h1>登录</h1>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          name="password"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">邮箱登录</button>
      </form>
      {error ? <p>{error}</p> : null}
      <button type="button">手机号验证码登录</button>
      <button type="button">微信登录</button>
      <button type="button">Google 登录</button>
    </main>
  );
}
