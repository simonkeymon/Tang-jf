import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  footer?: ReactNode;
}>) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <section className="auth-panel auth-brand">
          <span className="pill">Tang · 健康饮食助手</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <ul className="auth-list">
            <li>围绕体重、计划、食谱与打卡建立稳定的日常节奏。</li>
            <li>先完善资料，再生成适合你的饮食安排。</li>
            <li>把今天该吃什么、做到了多少，一次看清楚。</li>
          </ul>
        </section>

        <section className="auth-panel">
          <div className="stack" style={{ gap: 20 }}>
            <div>
              <Link to="/" className="pill">
                返回首页
              </Link>
            </div>
            {children}
            {footer}
          </div>
        </section>
      </div>
    </div>
  );
}
