const siteUrl = "https://mynameistito.com";

/** Creates social-card metadata that points to a page-specific Takumi image.
 * @param title - The title shown in social previews.
 * @param description - The description shown in social previews.
 * @returns Open Graph and Twitter metadata for the page.
 */
export const socialMeta = (title: string, description: string) => {
  const imageUrl = new URL("/og-image", siteUrl);
  imageUrl.searchParams.set("title", title);
  imageUrl.searchParams.set("description", description);

  return [
    { content: title, property: "og:title" },
    { content: description, property: "og:description" },
    { content: "website", property: "og:type" },
    { content: imageUrl.href, property: "og:image" },
    { content: "1200", property: "og:image:width" },
    { content: "630", property: "og:image:height" },
    { content: "summary_large_image", name: "twitter:card" },
    { content: title, name: "twitter:title" },
    { content: description, name: "twitter:description" },
    { content: imageUrl.href, name: "twitter:image" },
  ];
};
