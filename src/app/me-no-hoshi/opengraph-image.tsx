import { generateOgImage, ogSize } from "@/lib/og";

export const runtime = "edge";
export const alt = "目の星 — Hayato Kano";
export const size = ogSize;
export const contentType = "image/png";

export default function OgImage() {
  return generateOgImage("目の星");
}
