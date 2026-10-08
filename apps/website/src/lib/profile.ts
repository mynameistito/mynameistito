/** Public profile details shared across the portfolio routes. */
export const profile = {
  name: "Tito",
  subtitle: "New Zealand · developer",
  avatar: "/assets/avatar.png",
  verifiedMark: "/paper-assets/429NJ2Y9GH109VMS8WGXF0K80B.svg",
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
      logo: "https://www.google.com/s2/favicons?domain=kzg.com&sz=64",
      href: "https://kzg.com",
      highlights: ["I work on game servers and the systems around them."],
    },
    {
      company: "gamehostbros",
      title: "Co-Founder",
      period: "2023 - Present",
      logo: "https://www.google.com/s2/favicons?domain=gamehostbros.com&sz=64",
      href: "https://gamehostbros.com",
      highlights: [
        "We provide game server hosting, making it easy for people to run servers for the games they play.",
      ],
    },
  ],
} as const;
