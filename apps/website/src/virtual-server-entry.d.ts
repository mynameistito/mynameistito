declare module "virtual:tanstack-start-server-entry" {
  const server: {
    readonly fetch: (request: Request) => Promise<Response>;
  };

  export default server;
}
