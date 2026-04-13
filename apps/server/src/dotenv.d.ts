declare module 'dotenv' {
  interface DotenvConfigResult {
    parsed?: Record<string, string>;
    error?: Error;
  }

  interface DotenvModule {
    config(options?: Record<string, unknown>): DotenvConfigResult;
  }

  const dotenv: DotenvModule;

  export default dotenv;
}
