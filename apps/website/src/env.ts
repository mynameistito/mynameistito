interface AppEnv {
  readonly CONTACT_RECIPIENT?: string;
  readonly RESEND_API_KEY?: string;
  readonly RESEND_FROM?: string;
  readonly GITHUB_TOKEN?: string;
  readonly VISITOR_SERVICE?: {
    readonly fetch: (request: Request) => Promise<Response>;
  };
}

/** Loads Cloudflare bindings in production and environment variables in Vite dev.
 * @returns The values available to the website server routes.
 */
export const getAppEnv = async (): Promise<AppEnv> => {
  const { env } = await import("cloudflare:workers");
  // SAFETY: Alchemy configures production bindings; Cloudflare Vite loads local Worker bindings.
  const bindings = env as AppEnv;
  if (!import.meta.env.DEV) {
    return bindings;
  }
  return {
    ...bindings,
    CONTACT_RECIPIENT:
      process.env.CONTACT_RECIPIENT ?? bindings.CONTACT_RECIPIENT,
    GITHUB_TOKEN:
      process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? bindings.GITHUB_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? bindings.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM ?? bindings.RESEND_FROM,
  };
};
