interface TestEmojiComponentEmbed {
  readonly component: {
    readonly type: 17;
    readonly accent_color: number;
    readonly components: readonly [
      { readonly type: 10; readonly content: string },
      {
        readonly type: 1;
        readonly components: readonly [
          {
            readonly type: 2;
            readonly style: 5;
            readonly url: string;
            readonly label: string;
            readonly emoji: { readonly id: string; readonly name: string };
          },
        ];
      },
    ];
  };
}

/** Minimal preview to check how a custom emoji renders on a Discord link button. */
export const testEmojiComponentEmbed = {
  component: {
    type: 17,
    accent_color: 12_906_603,
    components: [
      {
        type: 10,
        content:
          "# Custom emoji button test\nThis button tests a custom emoji in a link preview.",
      },
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 5,
            url: "https://discord.com/users/611746802122620937",
            label: "Discord",
            emoji: { id: "1323823556869492827", name: "dinonword" },
          },
        ],
      },
    ],
  },
} as const satisfies TestEmojiComponentEmbed;
