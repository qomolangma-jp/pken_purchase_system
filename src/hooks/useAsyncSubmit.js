import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 外部リダイレクトなど、画面遷移までロックを解除したくない場合に fn から返す値。
 */
export const KEEP_LOCKED = Symbol('KEEP_LOCKED');

/**
 * 非同期送信の二重実行を防ぐフック。
 * state だけでは連打時に再描画前の2回目を防げないため、ref による同期ロックを併用する。
 *
 * @param {(...args:any[]) => Promise<any>} fn 送信処理
 * @returns {{ run: Function, isSubmitting: boolean }}
 */
export const useAsyncSubmit = (fn) => {
  const lockRef = useRef(false);
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    if (lockRef.current) return undefined;
    lockRef.current = true;
    setIsSubmitting(true);
    let keepLocked = false;
    try {
      const result = await fnRef.current(...args);
      keepLocked = result === KEEP_LOCKED;
      return result;
    } finally {
      if (!keepLocked) {
        lockRef.current = false;
        if (mountedRef.current) setIsSubmitting(false);
      }
    }
  }, []);

  return { run, isSubmitting };
};

export default useAsyncSubmit;
