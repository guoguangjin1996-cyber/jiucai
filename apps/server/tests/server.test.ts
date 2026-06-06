import { afterEach, describe, expect, it } from "vitest";
import { createAppServer } from "../src/index";

describe("server", () => {
  const apps: ReturnType<typeof createAppServer>[] = [];

  afterEach(() => {
    for (const app of apps.splice(0)) {
      app.wss.close();
      app.server.close();
    }
  });

  it("creates an HTTP and WebSocket room server without starting gameplay", () => {
    const app = createAppServer();
    apps.push(app);

    expect(app.server.listening).toBe(false);
    expect(app.wss.clients.size).toBe(0);
    expect(app.roomManager).toBeDefined();
  });
});
