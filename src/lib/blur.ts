/* 軽量な SVG blur プレースホルダーを生成 */
export function blurDataURL(width: number, height: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#d4d4d4"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
