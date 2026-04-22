"use client";

/**
 * CMS データ取得汎用フック
 *
 * GardenPageClient / TextPageClient 等で共通していた
 * `useEffect + useState` パターンを汎用化したもの。
 *
 * 使用例:
 *   const { data: nodes, loading } = useCmsData(fetchGardenFromCms, []);
 */

import { useEffect, useState } from "react";

export type UseCmsDataResult<T> = {
  /** 取得したデータ（初期値は initialData） */
  data: T;
  /** 取得中かどうか */
  loading: boolean;
  /** 取得エラー（成功時は null） */
  error: Error | null;
};

/**
 * 非同期データ取得フック。
 *
 * @param fetcher - データを返す非同期関数
 * @param initialData - ローディング中に返すデフォルト値
 */
export function useCmsData<T>(
  fetcher: () => Promise<T>,
  initialData: T,
): UseCmsDataResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(initialData);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      /* アンマウント時に setState を呼ばないようにキャンセル */
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
}
