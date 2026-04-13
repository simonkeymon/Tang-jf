import { Link } from 'react-router-dom';

export function BottomNav() {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '1rem',
        backgroundColor: '#fff',
        borderTop: '1px solid #eee',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none', color: '#333' }}>
        首页
      </Link>
      <Link to="/recipe/today" style={{ textDecoration: 'none', color: '#333' }}>
        食谱
      </Link>
      <Link to="/food-analysis" style={{ textDecoration: 'none', color: '#333' }}>
        拍照
      </Link>
      <Link to="/tracking" style={{ textDecoration: 'none', color: '#333' }}>
        记录
      </Link>
      <Link to="/profile" style={{ textDecoration: 'none', color: '#333' }}>
        我的
      </Link>
    </nav>
  );
}
