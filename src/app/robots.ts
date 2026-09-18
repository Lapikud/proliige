import type { MetadataRoute } from "next";
import { env } from "~/env.config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/users/"],
      disallow: ["/admin/", "/api/", "/tasks", "/proofs", "/notifications", "/login"],
    },
    sitemap: new URL("/sitemap.xml", env.SITE_URL).href,
  };
}
