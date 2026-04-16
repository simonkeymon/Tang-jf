import { Link, NavLink, Outlet } from 'react-router-dom';
import { Button, PageContainer } from '@tang/shared';

import { useAuth } from '../hooks/useAuth';
import { BottomNav } from './BottomNav';
import { NAV_ITEMS } from './navigation-items';

export function AppShell() {
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <PageContainer className="app-shell-frame" style={{ paddingBottom: 0 }}>
        <header className="topbar">
          <Link to="/" className="brand" aria-label="Tang 首页">
            <span className="brand-mark">Tang</span>
            <div>
              <p className="brand-title">Tang AI 健康饮食助手</p>
              <p className="brand-subtitle">以计划、食谱、打卡与总结构成稳定执行闭环。</p>
            </div>
          </Link>

          <nav className="topbar-nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `topbar-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="inline-actions topbar-actions">
            <Link to="/settings/ai" className="pill topbar-chip">
              AI 设置
            </Link>
            <span className="pill topbar-chip">{user?.email ?? '未登录'}</span>
            <Button type="button" variant="ghost" onClick={logout}>
              退出登录
            </Button>
          </div>
        </header>
      </PageContainer>
      <Outlet />
      <BottomNav />
    </div>
  );
}
