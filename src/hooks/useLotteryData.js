import { useEffect, useRef, useState } from 'react';
import { fetchOpenLotteries } from '../api/dira.js';

const ONE_HOUR_MS = 60 * 60 * 1000;

export default function useLotteryData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  async function load() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    try {
      const result = await fetchOpenLotteries({ signal: ctrl.signal });
      setData(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message ?? String(err));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, ONE_HOUR_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, []);

  return { data, loading, error, items: data?.items ?? [] };
}
