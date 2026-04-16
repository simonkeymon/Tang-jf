export function SkeletonCard() {
  return (
    <div
      style={{
        height: 96,
        borderRadius: 18,
        marginBottom: 12,
        background: 'linear-gradient(90deg, rgba(232,238,251,1), rgba(245,248,255,1))',
      }}
    />
  );
}

export function FullPageLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: '#5f6d87',
      }}
    >
      正在加载你的健康数据...
    </div>
  );
}
