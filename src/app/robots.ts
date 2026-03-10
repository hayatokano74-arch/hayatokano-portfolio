/* robots.txt 生成 */

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/post/"],
    },
    sitemap: "https://hayatokano.com/sitemap.xml",
  };
}
