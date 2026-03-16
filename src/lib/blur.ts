/* 軽量な SVG blur プレースホルダーを生成
   サイト背景色（#ececec）に近い色で、ページ遷移時に灰色の四角が目立たないようにする */
export function blurDataURL(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ececec"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
