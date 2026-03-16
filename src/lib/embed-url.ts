/** YouTube / Vimeo の URL を埋め込み用に変換。該当しなければ null */
export function getEmbedUrl(src: string): string | null {
  /* YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID */
  const ytMatch = src.match(
    /(?:youtube\.com\/(?:watch\?.*v=|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;

  /* Vimeo: vimeo.com/ID */
  const vmMatch = src.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;

  return null;
}
