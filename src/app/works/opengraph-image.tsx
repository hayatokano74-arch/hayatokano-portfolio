import { generateOgImage, ogSize } from "@/lib/og";

export const dynamic = 'force-static'
export const alt = "Works — Hayato Kano";
export const size = ogSize;
export const contentType = "image/png";

export default function OgImage() {
  return generateOgImage("Works");
}
