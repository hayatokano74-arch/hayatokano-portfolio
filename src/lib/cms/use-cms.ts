"use client";

/**
 * クライアントサイド CMS データフェッチフック
 *
 * ブラウザから直接 CMS API を叩いてデータを取得する。
 * B案: CMS更新が即座に反映される。
 */

import { useState, useEffect } from "react";

const CMS_API_BASE = "https://hayatokano.com/_cms/api";

/** CMS API レスポンスの共通形式 */
interface CmsResponse<T> {
  success: boolean;
  data: T;
}

/** フェッチ状態 */
export type CmsState<T> =
  | { status: "loading"; data: null }
  | { status: "ready"; data: T }
  | { status: "error"; data: null; error: string };

/** クライアントサイドで CMS API からデータを取得するフック */
export function useCms<T>(path: string): CmsState<T> {
  const [state, setState] = useState<CmsState<T>>({
    status: "loading",
    data: null,
  });

  useEffect(() => {
    let cancelled = false;
    const url = `${CMS_API_BASE}/${path.replace(/^\//, "")}`;

    fetch(url, { headers: { Accept: "application/json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        /* { success, data } 形式か直接データかを判別 */
        const data = (json && typeof json === "object" && "success" in json && "data" in json)
          ? json.data as T
          : json as T;
        setState({ status: "ready", data });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: "error", data: null, error: String(err) });
      });

    return () => { cancelled = true; };
  }, [path]);

  return state;
}

/** 汎用のクライアントサイド CMS フェッチ関数（非フック版）
 *  APIは直接データを返す形式（配列 or オブジェクト）と
 *  { success, data } 形式の両方に対応する。
 */
export async function fetchCmsClient<T>(path: string): Promise<T> {
  const url = `${CMS_API_BASE}/${path.replace(/^\//, "")}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CMS API エラー: ${res.status}`);
  const json = await res.json();
  /* { success, data } 形式のレスポンスか、直接データかを判別 */
  if (json && typeof json === "object" && "success" in json && "data" in json) {
    if (!json.success) throw new Error("CMS API レスポンスエラー");
    return json.data as T;
  }
  return json as T;
}
