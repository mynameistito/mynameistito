import { profile } from "@/lib/profile";
import { siteUrl } from "@/lib/social-meta";

interface DiscordLinkButton {
  readonly type: 2;
  readonly style: 5;
  readonly url: string;
  readonly label: string;
}

interface DiscordComponentEmbed {
  readonly component: {
    readonly type: 17;
    readonly accent_color: number;
    readonly components: readonly [
      {
        readonly type: 9;
        readonly components: readonly [
          { readonly type: 10; readonly content: string },
        ];
        readonly accessory: {
          readonly type: 11;
          readonly media: { readonly url: string };
        };
      },
      {
        readonly type: 1;
        readonly components: readonly DiscordLinkButton[];
      },
    ];
  };
}

/**
 * The custom Discord preview for the homepage, using only display components.
 */
export const homepageDiscordEmbed = {
  component: {
    type: 17,
    accent_color: 12_906_603,
    components: [
      {
        type: 9,
        components: [
          {
            type: 10,
            content:
              "# [Tito](https://mynameistito.com)\nDeveloper from New Zealand building tools, services, and experiments.",
          },
        ],
        accessory: {
          type: 11,
          media: { url: new URL(profile.avatar, siteUrl).href },
        },
      },
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            url: new URL("/projects", siteUrl).href,
            label: "Projects",
          },
          {
            type: 2,
            style: 5,
            url: `https://github.com/${profile.github}`,
            label: "GitHub",
          },
          {
            type: 2,
            style: 5,
            url: `https://discord.com/users/${profile.discord}`,
            label: "Discord",
          },
          {
            type: 2,
            style: 5,
            url: new URL("/contact", siteUrl).href,
            label: "Contact",
          },
        ],
      },
    ],
  },
} as const satisfies DiscordComponentEmbed;
