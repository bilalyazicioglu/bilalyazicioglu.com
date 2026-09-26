import type { MetadataRoute } from "next";
import { siteConfig } from "@/site.config";
import { getAllPosts } from "@/lib/blog";

export default function sitemap(): MetadataRoute.Sitemap {
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
      url: `${baseUrl}/tincan`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
      alternates: {
        languages: { en: `${baseUrl}/tincan`, tr: `${baseUrl}/tincan/tr` },
      },
      images: [`${baseUrl}/tincan/preview.png`],
      videos: [
        {
          title: "tincan in a real terminal",
          description:
            "A 12-second screen recording of tincan, serverless peer-to-peer voice chat for the terminal.",
          thumbnail_loc: `${baseUrl}/tincan/demo-poster.jpg`,
          content_loc: `${baseUrl}/uploads/blog/tincan-demo.mp4`,
          duration: 12,
        },
      ],
    },
    {
      url: `${baseUrl}/tincan/tr`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: { en: `${baseUrl}/tincan`, tr: `${baseUrl}/tincan/tr` },
      },
      images: [`${baseUrl}/tincan/preview.png`],
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
