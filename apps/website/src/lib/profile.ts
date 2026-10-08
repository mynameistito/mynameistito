/** Public profile details shared across the portfolio routes. */
export const profile = {
  name: "Tito",
  avatar: "/assets/avatar.png",
  github: "mynameistito",
  x: "mynameistito",
  discord: "611746802122620937",
  signal: "o10iMEWc_xFVfKybiNjvyWqfps8eFNbegYKeK29vgfFcfuSlm7RI6avAqtBAVp0M",
  "x-dm": "944890914169745408",
  introduction: [
    "I'm Tito, a developer from New Zealand. I like messing with things and seeing where they go.",
    "I build little tools, services, and experiments around whatever has my attention. A lot of that ends up involving Cloudflare, developer tools, or finding a better way to do something I already do.",
  ],
  experience: [
    {
      company: "KZG",
      title: "COO",
      aside: "(very corporate larp title)",
      period: "Present",
      logo: "/assets/logos/kzg.svg",
      logoLight: "/assets/logos/kzg-light.svg",
      logoBackground: "kzg",
      href: "https://kzg.gg",
      highlights: ["I work on game servers and the systems around them."],
    },
    {
      company: "Game Host Bros",
      title: "Co-Founder",
      period: "2023 - Present",
      logo: "/assets/logos/gamehostbros.svg",
      logoLight: "/assets/logos/gamehostbros.svg",
      logoBackground: "gamehostbros",
      href: "https://gamehostbros.com",
      highlights: [
        "We provide game server hosting, making it easy for people to run servers for the games they play.",
      ],
    },
  ],
} as const;
