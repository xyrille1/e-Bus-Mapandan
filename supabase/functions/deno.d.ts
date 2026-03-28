// Ambient type declarations for Deno globals used in Supabase Edge Functions.
// This file is intentionally minimal — only the APIs actually used in this project.

declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
  };

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
}
