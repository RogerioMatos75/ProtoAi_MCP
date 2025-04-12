/// <reference no-default-lib="true" />
/// <reference lib="deno.window" />
/// <reference lib="deno.unstable" />

declare module "http/server.ts" {
    export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}