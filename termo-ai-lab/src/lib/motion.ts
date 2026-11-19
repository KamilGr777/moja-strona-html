import { useEffect, useState } from 'react';
import { useProgress } from './store';

function systemReduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Czy ograniczyć animacje — według ustawień aplikacji albo ustawień systemu. */
export function useReducedMotionPref(): boolean {
  const pref = useProgress((s) => s.settings.motion);
  const [sys, setSys] = useState(systemReduced);
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const on = () => setSys(mq!.matches);
    mq.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);
  if (pref === 'reduce') return true;
  if (pref === 'full') return false;
  return sys;
}
