import { DependencyList, useCallback, useEffect, useRef, useState } from 'react';

export function useApiQuery<T>(request: () => Promise<T>, deps: DependencyList = [], enabled = true) {
  const requestRef = useRef(request);
  requestRef.current = request;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(enabled);
  const run = useCallback(async () => {
    setLoading(true); setError(null);
    try { const next = await requestRef.current(); setData(next); return next; }
    catch (cause) { const next = cause instanceof Error ? cause : new Error('요청에 실패했습니다.'); setError(next); throw next; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (!enabled) { setLoading(false); return; } void run().catch(() => undefined); }, [enabled, run, ...deps]);
  return { data, error, loading, reload: run, setData };
}

export function useApiMutation<TArgs extends unknown[], TResult>(request: (...args: TArgs) => Promise<TResult>) {
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const mutate = useCallback(async (...args: TArgs) => {
    setLoading(true); setError(null);
    try { const result = await request(...args); setData(result); return result; }
    catch (cause) { const next = cause instanceof Error ? cause : new Error('요청에 실패했습니다.'); setError(next); throw next; }
    finally { setLoading(false); }
  }, [request]);
  return { mutate, data, error, loading, reset: () => { setData(null); setError(null); } };
}

