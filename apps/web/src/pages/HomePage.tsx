import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const { logout } = useAuth();

  return (
    <main>
      <h1>主页</h1>
      <p>认证路由已接入。</p>
      <button type="button" onClick={logout}>
        退出登录
      </button>
    </main>
  );
}
