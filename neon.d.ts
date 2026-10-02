/**
 * Type declarations for @neon/config/v1
 */
declare module "@neon/config/v1" {
  export interface NeonConfig {
    [key: string]: unknown;
  }

  export function defineConfig<T extends NeonConfig>(config: T): T;
}
