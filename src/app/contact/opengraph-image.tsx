import { generateOgImage, ogSize } from "@/lib/og";

export const runtime = "edge";
export const alt = "Contact — Hayato Kano";
export const size = ogSize;
export const contentType = "image/png";

export default function OgImage() {
  return generateOgImage("Contact");
}
