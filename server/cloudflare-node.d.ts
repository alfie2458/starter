declare module "cloudflare:node" {
  export interface NodeHttpServerHandler {
    fetch(request: Request, env?: unknown, context?: unknown): Promise<Response>;
  }

  export function httpServerHandler(options: {
    port: number;
  }): NodeHttpServerHandler;
}
