export type ExperienceItem = {
  org: string;
  role: string;
  place: string;
  period: string;
  bullets: string[];
};

export type EducationItem = {
  school: string;
  program: string;
  place: string;
  period: string;
};

export type LeadershipItem = {
  org: string;
  role: string;
  place: string;
  period: string;
  bullet: string;
};

export const experience: ExperienceItem[] = [
  {
    org: "Software Architecture Project (yovi_en1b)",
    role: "Developer / Architect",
    place: "Academic",
    period: "2026",
    bullets: [
      "Engineered a multi-service platform featuring a hexagonal game engine implemented in Rust, focusing on decoupled design and maintainability.",
      "Designed and deployed a microservices architecture using Docker, ensuring scalability and high availability across services.",
      "Implemented GitHub Actions pipelines to automate testing and deployment, adhering to arc42 documentation standards.",
    ],
  },
  {
    org: "Kombi Klima Shop",
    role: "Software Developer Intern",
    place: "Istanbul, TR",
    period: "2025",
    bullets: [
      "Enhanced an e-commerce backend with Java/Spring Boot, improving system performance and user-facing features.",
      "Developed a SQL-based stock automation system, reducing manual tracking errors significantly.",
    ],
  },
];

export const education: EducationItem[] = [
  {
    school: "Marmara University",
    program: "BS in Computer Engineering (GPA 3.34/4.0)",
    place: "Istanbul, TR",
    period: "2024 – 2028",
  },
  {
    school: "Marmara University",
    program: "Minor in Business Administration",
    place: "Istanbul, TR",
    period: "2025 – 2028",
  },
  {
    school: "Universidad de Oviedo",
    program: "Erasmus+ Exchange Student, Computer Science",
    place: "Oviedo, ES",
    period: "2026",
  },
];

export const leadership: LeadershipItem[] = [
  {
    org: "Tuta — Open Source",
    role: "Localization Translator",
    place: "Remote",
    period: "Present",
    bullet: "Contributing translations to an open-source, privacy-first email and calendar client.",
  },
  {
    org: "Universidad de Oviedo Basketball Team",
    role: "Team Athlete",
    place: "Oviedo, ES",
    period: "2026",
    bullet: "Represented the university in competitive matches, demonstrating cross-cultural communication and adaptability in a multinational sports environment.",
  },
  {
    org: "Marmara University Basketball Team",
    role: "Team Athlete",
    place: "Istanbul, TR",
    period: "Present",
    bullet: "Active member applying 10+ years of competitive sports discipline to agile teamwork in engineering projects.",
  },
];

export const skills = {
  Languages: ["Rust", "Go", "Java", "Python", "C", "SQL", "TypeScript", "JavaScript"],
  "Systems & Networking": ["Linux", "TCP/IP", "DNS", "HTTP/TLS", "QUIC", "P2P Networking", "SSH"],
  "Infrastructure & Observability": ["Docker", "GitHub Actions", "Nginx", "Cloudflare", "Tailscale", "Prometheus", "Grafana", "Loki"],
  "Backend & Data": ["Spring Boot", "Node.js/Express", "REST APIs", "PostgreSQL", "MySQL", "MongoDB", "Redis"],
  Web: ["React", "Next.js", "Three.js"],
  "Spoken Languages": ["Turkish (Native)", "English (Proficient)", "Spanish (Elementary)"],
};
