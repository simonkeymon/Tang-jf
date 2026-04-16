import { NavLink } from 'react-router-dom';

import { NAV_ITEMS } from './navigation-items';

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
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
