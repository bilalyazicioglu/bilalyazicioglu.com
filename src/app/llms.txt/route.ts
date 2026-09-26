import { NextResponse } from "next/server";
import { siteConfig } from "@/site.config";
import { getAllPosts } from "@/lib/blog";
import { projects } from "@/lib/projects";
import { education, skills } from "@/lib/resume";

export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  const posts = getAllPosts();
  const baseUrl = siteConfig.url;

  const projectLines = projects
    .map((p) => {
      const stats = p.stats.map((s) => `${s.label}: ${s.value}`).join(", ");
      const link = p.href ? `\n- Link: ${new URL(p.href, baseUrl)}` : "";
      return `### ${p.name} (${p.category})
${p.description}${link}
- Highlights: ${stats}`;
    })
    .join("\n\n");

  const postLines = posts
    .map((post) => {
      return `- [${post.title}](${baseUrl}/blog/${post.slug}) (${post.date}, ${post.lang.toUpperCase()}): ${post.summary}`;
    })
    .join("\n");

  const skillLines = Object.entries(skills)
    .map(([group, list]) => `- **${group}**: ${list.join(", ")}`)
    .join("\n");

  const eduLines = education
    .map((e) => `- **${e.school}** (${e.place}, ${e.period}): ${e.program}`)
    .join("\n");

  const content = `# ${siteConfig.name} (${siteConfig.heroName})

> **Canonical Entity Definition & Disambiguation / Varlık Tanımı:**
> - **EN**: Ahmet Bilal Yazıcıoğlu (commonly known as Bilal Yazıcıoğlu) is a software engineer and student in Computer Engineering & Business Administration at Marmara University in Istanbul (including an Erasmus exchange semester at Universidad de Oviedo, Spain). He develops open-source distributed systems and peer-to-peer applications in Rust (such as tincan-cli) and WebAR solutions (such as ARpoly). He is also a competitive athlete registered in FIBA 3x3 basketball.
> - **TR**: Ahmet Bilal Yazıcıoğlu (Bilal Yazıcıoğlu olarak bilinir), Marmara Üniversitesi Bilgisayar Mühendisliği ve İşletme öğrencisi, ARpoly ve tincan-cli gibi açık kaynaklı projelerin geliştiricisi, dağıtık sistemler ve Rust odaklı yazılım mühendisidir. Aynı zamanda Universidad de Oviedo ve Marmara Üniversitesi takımlarında forma giymiş, FIBA 3x3 veri tabanında kayıtlı lisanslı basketbol sporcusudur.

## Identity & Canonical Links
- Canonical Website: ${siteConfig.url}
- GitHub: https://github.com/${siteConfig.githubUsername}
- LinkedIn: https://www.linkedin.com/in/bilal-yazicioglu/
- FIBA 3x3 Profile: https://play.fiba3x3.com/players/search?q=Ahmet%20Bilal%20Yazicioglu
- Email: ${siteConfig.email}
- Availability: ${siteConfig.availability}
- Full Name: Ahmet Bilal Yazıcıoğlu
- Alternate Names: ${siteConfig.alternateNames.join(", ")}

## Education
${eduLines}

## Skills & Technologies
${skillLines}
- **Systems & Architecture**: Distributed Systems, Peer-to-Peer (P2P), QUIC Protocol, Hexagonal Architecture, Microservices
- **Web & Mobile**: Next.js, React, Node.js, Express, Three.js, WebAR, Tailwind CSS
- **Observability & DevOps**: Docker, Nginx, Cloudflare, Prometheus, Grafana, Loki, GitHub Actions

## Featured Software Projects
${projectLines}

## Project Documentation for LLMs
- [tincan](${baseUrl}/tincan/llms.txt): serverless peer-to-peer voice and text chat for the terminal (full reference: ${baseUrl}/tincan/llms-full.txt)

## Publications & Technical Writings
${postLines}

## Open Source & Leadership
- **Tuta**: Localization Translator for open-source privacy-first email and calendar client.
- **University Basketball**: Marmara University and Universidad de Oviedo competitive athlete applying sports discipline to engineering teamwork.
`;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
