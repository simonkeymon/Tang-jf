import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: '🏠', end: true },
  { to: '/plan', label: '计划', icon: '🎯' },
  { to: '/recipe/today', label: '食谱', icon: '🥗' },
  { to: '/food-analysis', label: '拍照', icon: '📷' },
  { to: '/tracking', label: '记录', icon: '📈' },
  { to: '/profile', label: '我的', icon: '👤' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `bottom-nav-link${isActive ? ' active' : ''}`}
        >
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
