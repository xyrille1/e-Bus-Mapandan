// Minimal type declarations for deno.land/x/bcrypt@v0.4.1
// Only the functions used in this project are declared.

export function hash(data: string, saltRounds?: number): Promise<string>;
export function compare(data: string, hash: string): Promise<boolean>;
