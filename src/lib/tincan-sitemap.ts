import type { MetadataRoute } from "next";
import { TINCAN_URL } from "./tincan-host";

export function tincanSitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: TINCAN_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: { en: TINCAN_URL, tr: `${TINCAN_URL}/tr` },
      },
      images: [`${TINCAN_URL}/tincan/preview.png`],
      videos: [
        {
          title: "tincan in a real terminal",
          description:
            "A 12-second screen recording of tincan, serverless peer-to-peer voice chat for the terminal.",
          thumbnail_loc: `${TINCAN_URL}/tincan/demo-poster.jpg`,
          content_loc: `${TINCAN_URL}/uploads/blog/tincan-demo.mp4`,
          duration: 12,
        },
      ],
    },
    {
      url: `${TINCAN_URL}/tr`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: { en: TINCAN_URL, tr: `${TINCAN_URL}/tr` },
      },
      images: [`${TINCAN_URL}/tincan/preview.png`],
    },
  ];
}
