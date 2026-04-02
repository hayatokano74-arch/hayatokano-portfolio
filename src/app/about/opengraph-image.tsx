import { generateOgImage, ogSize } from "@/lib/og";

export const dynamic = 'force-static'
export const alt = "About — Hayato Kano";
export const size = ogSize;
export const contentType = "image/png";

export default function OgImage() {
  return generateOgImage("About");
}
