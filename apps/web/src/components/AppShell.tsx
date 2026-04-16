import { Outlet } from 'react-router-dom';
import { Button, PageContainer } from '@tang/shared';

import { useAuth } from '../hooks/useAuth';
import { BottomNav } from './BottomNav';

export function AppShell() {
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <PageContainer style={{ paddingBottom: 0 }}>
        <header className="topbar">
          <div className="brand">
            <p className="brand-title">Tang AI 健康饮食助手</p>
            <p className="brand-subtitle">围绕计划、食谱、打卡和总结的一站式日常陪跑。</p>
          </div>
          <div className="inline-actions">
            <span className="pill">{user?.email ?? '未登录'}</span>
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
