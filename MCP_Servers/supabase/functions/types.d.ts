/// <reference no-default-lib="true" />
/// <reference lib="deno.window" />
/// <reference lib="deno.unstable" />

declare namespace Deno {
    export interface Env {
        get(key: string): string | undefined;
        set(key: string, value: string): void;
        delete(key: string): void;
        toObject(): { [key: string]: string };
    }

    export const env: Env;
}

declare module "http/server.ts" {
    export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}