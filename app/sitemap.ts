import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants/app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: APP_URL, priority: 1, changeFrequency: "weekly" },
    { url: `${APP_URL}/signup`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${APP_URL}/login`, priority: 0.4, changeFrequency: "monthly" },
    { url: `${APP_URL}/investor/join`, priority: 0.7, changeFrequency: "monthly" },
  ];
}
