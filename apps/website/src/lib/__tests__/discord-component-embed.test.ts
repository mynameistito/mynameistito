import { describe, expect, it } from "vitest";

import { homepageDiscordEmbed } from "@/lib/discord-component-embed";
import { testEmojiComponentEmbed } from "@/lib/test-emoji-component-embed";

describe("homepage Discord component embed", () => {
  it("stays within Discord's 3,000-byte payload limit", () => {
    expect(
      new TextEncoder().encode(JSON.stringify(homepageDiscordEmbed)).byteLength
    ).toBeLessThanOrEqual(3000);
  });

  it("uses only link-style buttons with valid HTTPS destinations", () => {
    const [, actionRow] = homepageDiscordEmbed.component.components;

    expect(actionRow.type).toBe(1);
    for (const button of actionRow.components) {
      expect(button.style).toBe(5);
      expect(new URL(button.url).protocol).toBe("https:");
    }
  });
});

describe("test emoji Discord component embed", () => {
  it("uses the requested custom emoji on its Discord link button", () => {
    const [, actionRow] = testEmojiComponentEmbed.component.components;
    const [discordButton] = actionRow.components;

    expect(discordButton.label).toBe("Discord");
    expect(discordButton.emoji).toStrictEqual({
      id: "1323823556869492827",
      name: "dinonword",
    });
    expect(new URL(discordButton.url).protocol).toBe("https:");
  });
});
