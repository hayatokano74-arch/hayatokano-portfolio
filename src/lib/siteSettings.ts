import { cache } from "react";

/** 1ページあたりのデフォルト表示数 */
const DEFAULT_PER_PAGE = 12;

/** 1ページあたりの表示数を返す（定数） */
export const getPerPage = cache(async (): Promise<number> => DEFAULT_PER_PAGE);

