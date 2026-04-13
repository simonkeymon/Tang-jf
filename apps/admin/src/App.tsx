import { useEffect, useState } from 'react';

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

export default function App() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void loadAdminData();
  }, []);

  async function loadAdminData() {
    try {
      const token = localStorage.getItem('adminToken') ?? '';
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [usersRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/admin/users`, { headers }).then((res) => res.json()),
        fetch(`${apiBaseUrl}/admin/dashboard`, { headers }).then((res) => res.json()),
      ]);
      setUsers(usersRes.users ?? []);
      setStats(statsRes.stats ?? null);
    } catch {
      setUsers([]);
      setStats(null);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Admin Dashboard</h1>
      {stats ? (
        <section style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          <div>总用户数：{stats.totalUsers}</div>
          <div>今日活跃：{stats.activeToday}</div>
          <div>计划总数：{stats.plansCreated}</div>
          <div>平台 AI 已配置：{stats.platformAiConfigured ? '是' : '否'}</div>
        </section>
      ) : (
        <p>请先在浏览器 localStorage 中设置 adminToken 再访问后台数据。</p>
      )}

      <section>
        <h2>用户列表</h2>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              {user.email} · streak {user.streak} · {user.hasPlan ? '有计划' : '无计划'}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
