interface TurnstileApi {
  readonly render: (
    container: HTMLElement,
    options: {
      readonly sitekey: string;
      readonly action: string;
      readonly appearance: "interaction-only";
      readonly execution: "execute";
      readonly size: "normal";
      readonly callback: (token: string) => void;
      readonly "error-callback": () => void;
      readonly "expired-callback": () => void;
    }
  ) => string;
  readonly execute: (widgetId: string) => void;
  readonly remove: (widgetId: string) => void;
}

interface ActiveWidget {
  id?: string;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let apiPromise: Promise<TurnstileApi> | null = null;

const loadTurnstileApi = async (): Promise<TurnstileApi> => {
  if (window.turnstile) {
    return window.turnstile;
  }

  if (apiPromise !== null) {
    return await apiPromise;
  }

  const script = document.querySelector<HTMLScriptElement>(
    'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
  );

  if (!script) {
    throw new Error("Turnstile script is not configured.");
  }

  if (document.readyState === "complete") {
    throw new Error("Turnstile did not initialize.");
  }

  const {
    promise: pending,
    reject,
    resolve,
  } = Promise.withResolvers<TurnstileApi>();

  let timeout = 0;

  const onLoad = () => {
    window.clearTimeout(timeout);

    if (window.turnstile) {
      resolve(window.turnstile);
    } else {
      apiPromise = null;
      reject(new Error("Turnstile did not initialize."));
    }
  };

  const onError = () => {
    window.clearTimeout(timeout);
    apiPromise = null;
    reject(new Error("Turnstile failed to load."));
  };

  timeout = window.setTimeout(() => {
    script.removeEventListener("load", onLoad);
    script.removeEventListener("error", onError);
    apiPromise = null;
    reject(new Error("Turnstile load timed out."));
  }, 15_000);
  script.addEventListener("load", onLoad, { once: true });
  script.addEventListener("error", onError, { once: true });

  apiPromise = pending;

  return await pending;
};

/** Requests a one-use token without displaying the widget unless challenged.
 * @param sitekey - The public Turnstile sitekey.
 * @param action - The action associated with the protected request.
 * @param container - The element that hosts the widget if interaction is needed.
 * @returns A one-use token for the requested action.
 */
export const getTurnstileToken = async (
  sitekey: string,
  action: string
): Promise<string> => {
  const turnstile = await loadTurnstileApi();
  const container = document.createElement("div");
  const body = document.querySelector<HTMLBodyElement>("body");

  if (body === null) {
    throw new Error("The document body is unavailable.");
  }

  Node.prototype.appendChild.call(body, container);

  const { promise, reject, resolve } = Promise.withResolvers<string>();

  const startWidget = () => {
    const widget: ActiveWidget = {};
    const timeout = { id: 0 };
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeout.id);

      if (widget.id !== undefined) {
        turnstile.remove(widget.id);
      }

      container.remove();
    };

    const settle = (result: string | Error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (result instanceof Error) {
        reject(result);
      } else {
        resolve(result);
      }
    };

    timeout.id = window.setTimeout(() => {
      settle(new Error("Turnstile token request timed out."));
    }, 120_000);

    try {
      widget.id = turnstile.render(container, {
        sitekey,
        action,
        appearance: "interaction-only",
        execution: "execute",
        size: "normal",
        callback: (token) => {
          settle(token);
        },
        "error-callback": () => {
          settle(new Error("Turnstile token request failed."));
        },
        "expired-callback": () => {
          settle(new Error("Turnstile token expired."));
        },
      });
      turnstile.execute(widget.id);
    } catch (error) {
      settle(
        error instanceof Error
          ? error
          : new Error("Turnstile token request failed.")
      );
    }
  };

  startWidget();

  return await promise;
};
