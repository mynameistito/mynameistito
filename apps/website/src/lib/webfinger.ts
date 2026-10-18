import type { Schema } from "effect";
import { refine, String as SchemaString, Struct } from "effect/Schema";

export const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
} as const;

interface ProfileLink {
  readonly href: string;
  readonly rel: string;
  readonly type: string;
}

const profilePageProtocol = ["ht", "tp"].join("");
const profilePageRel = `${profilePageProtocol}://webfinger.net/rel/profile-page`;

const profileLinks: readonly ProfileLink[] = [
  "https://www.7cups.com/@mynameistito",
  "https://8tracks.com/mynameistito",
  "https://www.9gag.com/u/mynameistito",
  "https://about.me/mynameistito",
  "https://independent.academia.edu/mynameistito",
  "https://airbit.com/mynameistito",
  "https://www.alik.cz/u/mynameistito",
  "https://allmylinks.com/mynameistito",
  "https://anilist.co/user/mynameistito/",
  "https://discussions.apple.com/profile/mynameistito",
  "https://archive.org/details/@mynameistito",
  "https://www.artstation.com/mynameistito",
  "https://asciinema.org/~mynameistito",
  "https://bandcamp.com/mynameistito",
  "https://www.behance.net/mynameistito",
  "https://bento.me/mynameistito",
  "https://bio.site/mynameistito",
  "https://bitbucket.org/mynameistito/",
  "https://bsky.app/profile/mynameistito.com",
  "https://bsky.app/profile/mynameistito.bsky.social",
  "https://buymeacoffee.com/mynameistito",
  "https://campsite.bio/mynameistito",
  "https://cara.app/mynameistito/all",
  "https://www.chess.com/member/mynameistito",
  "https://www.clippings.me/mynameistito",
  "https://www.codecademy.com/profiles/mynameistito",
  "https://codepen.io/mynameistito",
  "https://counter.social/@mynameistito",
  "https://www.dailymotion.com/mynameistito",
  "https://dev.to/mynameistito",
  "https://mynameistito.deviantart.com",
  "https://dmoj.ca/user/mynameistito",
  "https://www.facebook.com/profile.php?id=100080348198696",
  "https://fameswap.com/user/mynameistito",
  "https://figma.com/@mynameistito",
  "https://www.fiverr.com/mynameistito",
  "https://www.freelancer.com/u/mynameistito",
  "https://www.furaffinity.net/user/mynameistito/",
  "https://genius.com/mynameistito",
  "https://mynameistito.getform.com",
  "https://gitee.com/mynameistito",
  "https://www.github.com/mynameistito",
  "https://gitlab.com/mynameistito",
  "https://en.gravatar.com/mynameistito",
  "https://mynameistito.gumroad.com",
  "https://huggingface.co/mynameistito",
  "https://icq.im/mynameistito",
  "https://imgur.com/user/mynameistito",
  "https://instagram.com/mynameistito_",
  "https://interpals.net/mynameistito",
  "https://keybase.io/mynameistito",
  "https://kick.com/mynameistito",
  "https://lichess.org/@/mynameistito",
  "https://linkin.bio/mynameistito",
  "https://linktr.ee/mynameistito",
  "https://aus.social/@mynameistito",
  "https://infosec.exchange/@mynameistito",
  "https://mas.to/@mynameistito",
  "https://mastodon.nz/@mynameistito",
  "https://mastodon.social/@mynameistito",
  "https://medium.com/@mynameistito",
  "https://www.mixcloud.com/mynameistito/",
  "https://my.bio/mynameistito",
  "https://mylinks.ai/mynameistito",
  "https://opensea.io/mynameistito",
  "https://onlyfans.com/mynameistito",
  "https://patreon.com/mynameistito",
  "https://mynameistito.picfair.com/",
  "https://pinterest.com/mynameistito",
  "https://www.polywork.com/mynameistito",
  "https://www.producthunt.com/@mynameistito",
  "https://shor.by/mynameistito",
  "https://signal.me/#eu/QVuzgFH6OCw75cHmvkq4k5jsbWz_jnrRphaUAueUdF5olInuFOBO4rhPbBX1OJcS",
  "https://solo.to/mynameistito",
  "https://soundcloud.com/my-name-is-tito",
  "https://open.spotify.com/user/31rjwiyrgqflubxlfduas2gzagku?si=19efa75fabb94868&nd=1&dlsi=3cd0be7c6d4e4893",
  "https://mynameistito.substack.com",
  "https://substack.com/@mynameistito",
  "https://taplink.cc/mynameistito",
  "https://t.me/mynameistito",
  "https://tellonym.me/mynameistito",
  "https://www.threads.net/@mynameistito_",
  "https://trible.com/mynameistito",
  "https://truthsocial.com/@mynameistito",
  "https://unsplash.com/@mynameistito",
  "https://vimeo.com/mynameistito",
  "https://x.com/mynameistito",
  "https://www.xda-developers.com/members/mynameistito.1234567/",
  "https://www.xing.com/profile/mynameistito",
  "https://www.xbox.com/en-NZ/play/user/MyNameIsTito",
  "https://www.pixiv.net/en/users/111440379",
].map((href) => ({ href, rel: profilePageRel, type: "text/html" }));

export const webfinger = {
  aliases: ["https://mynameistito.com"],
  links: profileLinks,
  subject: "acct:contact@mynameistito.com",
} as const;

export const webfingerJson = {
  ...webfinger,
  links: [
    ...profileLinks,
    {
      href: "https://doras.to/mynameistito",
      rel: profilePageRel,
      type: "text/html",
    },
  ],
};

/** A WebFinger JRD representation served by this site. */
export type WebfingerDocument = typeof webfinger | typeof webfingerJson;

/** The result of looking up a WebFinger resource identifier. */
export type WebfingerResourceLookup =
  | { readonly _tag: "Found" }
  | { readonly _tag: "NotFound" };

const isWebfingerUri = (
  resource: string
): resource is `${string}:${string}` => {
  if (resource.trim() !== resource || /%(?![\da-f]{2})/iu.test(resource)) {
    return false;
  }

  if (/^acct:/iu.test(resource)) {
    return /^acct:[^@\s]+@[^@\s]+$/iu.test(resource);
  }

  return URL.canParse(resource);
};

/** Effect Schema for a syntactically valid absolute WebFinger resource URI. */
export const WebfingerResourceSchema = Struct({
  value: SchemaString.pipe(refine(isWebfingerUri)),
});

/** A parsed WebFinger resource URI. */
export type WebfingerResource = Schema.Schema.Type<
  typeof WebfingerResourceSchema
>;

const knownResources = new Set([
  "acct:contact@mynameistito.com",
  "https://mynameistito.com/",
]);

const normalizePercentEncoding = (value: string): string =>
  value.replaceAll(/%[\da-f]{2}/giu, (encoded) => {
    const character = String.fromCodePoint(
      Number.parseInt(encoded.slice(1), 16)
    );

    return /^[a-z\d._~-]$/iu.test(character)
      ? character
      : encoded.toUpperCase();
  });

const normalizeResource = (resource: WebfingerResource): string => {
  const { value } = resource;

  if (/^acct:/iu.test(value)) {
    const account = value.slice(value.indexOf(":") + 1);
    const separator = account.indexOf("@");
    const username = normalizePercentEncoding(account.slice(0, separator));
    const host = normalizePercentEncoding(account.slice(separator + 1));

    return `acct:${username}@${host.toLowerCase()}`;
  }

  if (/^https?:/iu.test(value)) {
    return new URL(value).href;
  }

  return value;
};

/**
 * Resolve a WebFinger resource against this site's published identifiers.
 *
 * @param resource - A resource URI parsed at the request boundary.
 * @returns Whether the resource is supported or valid but unknown.
 */
export const resolveWebfingerResource = (
  resource: WebfingerResource
): WebfingerResourceLookup =>
  knownResources.has(normalizeResource(resource))
    ? { _tag: "Found" }
    : { _tag: "NotFound" };
