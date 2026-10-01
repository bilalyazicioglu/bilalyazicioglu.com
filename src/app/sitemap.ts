import type { MetadataRoute } from "next";
import { siteConfig } from "@/site.config";
import { getAllPosts } from "@/lib/blog";
import { headers } from "next/headers";
import { TINCAN_URL, isTincanHost } from "@/lib/tincan-host";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A sitemap may only list URLs on its own host, so tincan.rs gets its own.
  if (isTincanHost((await headers()).get("host"))) return tincanSitemap();

  const baseUrl = siteConfig.url;

  // Main static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/projects`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Dynamic blog post pages
  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...blogPosts];
}

function tincanSitemap(): MetadataRoute.Sitemap {
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
