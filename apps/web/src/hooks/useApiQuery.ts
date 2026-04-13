import { useEffect, useState } from 'react';

export function useApiQuery<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        setLoading(true);
        const result = await loader();
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch {
        if (mounted) {
          setError('请求失败');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loader]);

  return { data, loading, error };
}
