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
          <span className="pill">Tang · AI 营养教练</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <ul className="auth-list">
            <li>围绕体重、食谱、购物清单和总结构建日常陪跑流程。</li>
            <li>先完善资料，再一键生成计划与今日食谱。</li>
            <li>所有功能保持现有 React + Express + pnpm monorepo 框架。</li>
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
