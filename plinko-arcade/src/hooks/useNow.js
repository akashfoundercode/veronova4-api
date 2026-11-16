import { useEffect, useState } from 'react';

// Re-renders the caller every `interval` ms and returns Date.now().
export default function useNow(interval = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}
