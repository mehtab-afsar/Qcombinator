import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants/app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/signup", "/login", "/investor/join"],
        disallow: ["/api/", "/founder/", "/investor/", "/admin/", "/feed"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
