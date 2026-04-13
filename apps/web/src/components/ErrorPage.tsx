import { Link } from 'react-router-dom';

export default function ErrorPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>页面未找到</h1>
      <p>请返回首页继续使用。</p>
      <Link to="/">返回首页</Link>
    </main>
  );
}
