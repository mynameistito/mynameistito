const universityLogo = "/paper-assets/0ZD94Y8AR6GN0DF0Q1KHHZWQCR.png";
const universityName = "Western New England University";

/** Profile content transcribed from the apunlisted.com Paper design. */
export const profile = {
  name: "Akshar Patel",
  subtitle: "22 | larping dev",
  avatar: "/paper-assets/6S9J9JCVBGPWN32S6BFT2JGVX2.jpg",
  verifiedMark: "/paper-assets/429NJ2Y9GH109VMS8WGXF0K80B.svg",
  github: "https://github.com/AksharP5",
  x: "https://x.com/apunlisted",
  xDirectMessage: "https://x.com/messages/compose?recipient_id=1869385046",
  introduction: [
    "I currently work at Dow Jones.",
    "Outside work, I enjoy contributing to open source, building things, and following whatever has my attention. Browse my projects or take a look at my taste. You can also read my blog. Everyone has one. Mine is obviously different.",
  ],
  experience: [
    {
      company: "Dow Jones",
      title: "Senior Data Analyst",
      period: "2025 - Present",
      logo: "/paper-assets/617THXGK8AVZAFJ5QV622R5NXC.png",
      highlights: [
        "Automated the end-to-end VOC detail-classification workflow using text embeddings and retrieval-augmented generation (RAG), eliminating manual processing by 30+ hours per week.",
        "Built a VOC Snowflake agent for stakeholders to query data in natural language, improving self-service access to business data.",
        "Developed an automated dbt save-tracker pipeline, reducing daily manual effort by 80%, saving 10+ hours per week, and increasing reporting accuracy.",
        "Led the AWS-to-Snowflake migration by designing dbt models and transformation workflows that standardized data pipelines, improved query performance, and increased reliability for downstream reporting.",
      ],
    },
    {
      company: universityName,
      title: "Desktop Support Assistant",
      period: "2023 - 2025",
      logo: universityLogo,
      highlights: [
        "Provided technical support by answering phone calls and remotely accessing users' devices to troubleshoot and resolve issues efficiently.",
        "Assisted users in person, addressing walk-in inquiries and delivering prompt solutions to technical challenges.",
        "Re-imaged devices to maintain system integrity and improve performance, facilitating a smooth user experience.",
        "Set up labs, classrooms, and faculty workstations, ensuring all equipment was operational and ready for use.",
      ],
    },
    {
      company: universityName,
      title: "Peer Tutor",
      period: "2023 - 2024",
      logo: universityLogo,
      highlights: [
        "Adapted teaching methods to accommodate diverse learning styles and ensure comprehension of challenging subjects.",
        "Developed supplementary materials and resources to reinforce learning and address specific student needs.",
        "Facilitated one-on-one tutoring sessions, helping students grasp complex computer science concepts and improve their academic performance.",
        "Assisted peers in understanding programming languages and algorithms through tailored explanations and practical examples.",
      ],
    },
  ],
  skills: [
    "Python",
    "Java",
    "JavaScript",
    "TypeScript",
    "Go",
    "HTML / CSS",
    "Docker",
    "Flask",
    "RabbitMQ",
    "SQL",
    "Git",
    "AEM",
  ],
  education: {
    degree: "B.S. Computer Science",
    institution: universityName,
    period: "2021 - 2025",
    detail: "3.99 GPA",
  },
} as const;
