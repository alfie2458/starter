import { httpServerHandler } from "cloudflare:node";

type HyperdriveBinding = {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
};

type AssetsBinding = { fetch(request: Request): Promise<Response> };
type WorkerBindings = {
  ASSETS: AssetsBinding;
  HYPERDRIVE?: HyperdriveBinding;
  MANUS_PROJECT_ID?: string;
  MANUS_JWT_SECRET?: string;
  MANUS_OAUTH_API_URL?: string;
  MANUS_OAUTH_PORTAL_URL?: string;
  MANUS_API_URL?: string;
  MANUS_API_KEY?: string;
  MANUS_API_BROWSER_KEY?: string;
  OWNER_OPEN_ID?: string;
};
type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
};

const RUNTIME_ENV_KEYS = [
  "MANUS_PROJECT_ID",
  "MANUS_JWT_SECRET",
  "MANUS_OAUTH_API_URL",
  "MANUS_OAUTH_PORTAL_URL",
  "MANUS_API_URL",
  "MANUS_API_KEY",
  "MANUS_API_BROWSER_KEY",
  "OWNER_OPEN_ID",
] as const;

const expressHandler = httpServerHandler({ port: 3000 });
let appReady: Promise<void> | undefined;

async function startExpress(bindings: WorkerBindings): Promise<void> {
  if (!appReady) {
    appReady = (async () => {
      for (const key of RUNTIME_ENV_KEYS) {
        const value = bindings[key];
        if (typeof value === "string") process.env[key] = value;
      }

      if (bindings.HYPERDRIVE) {
        const { setHyperdriveBinding } = await import("./db");
        setHyperdriveBinding(bindings.HYPERDRIVE);
      }

      // Import after Worker bindings are copied so the OAuth SDK captures the correct base URL.
      const { createApp } = await import("./_core/app");
      await new Promise<void>((resolve, reject) => {
        const server = createApp().listen(3000, () => resolve());
        server.once("error", reject);
      });
    })().catch(error => {
      appReady = undefined;
      throw error;
    });
  }
  await appReady;
}

export default {
  async fetch(
    request: Request,
    bindings: WorkerBindings,
    context: WorkerContext
  ): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (!pathname.startsWith("/api/")) return bindings.ASSETS.fetch(request);

    try {
      await startExpress(bindings);
      return await expressHandler.fetch(request, bindings, context);
    } catch (error) {
      console.error("[Worker bootstrap] initialization failed", error instanceof Error ? error.name : "unknown");
      return Response.json(
        { error: "服務暫時無法使用，請稍後再試。" },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
  },
};
