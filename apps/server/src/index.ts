import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { GAME_NAME, SERVER_PORT } from "@jiucai-defense/shared";
import { createWsServer } from "./wsServer";

export function createAppServer() {
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      response.end(
        JSON.stringify({
          ok: true,
          name: GAME_NAME,
          notice: "虚构娱乐模拟"
        })
      );
      return;
    }

    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end(`${GAME_NAME} HTTP/WebSocket 房间服务：虚构娱乐模拟`);
  });

  const { wss, roomManager } = createWsServer(server);

  return { server, wss, roomManager };
}

export function startServer(port = SERVER_PORT) {
  const app = createAppServer();

  app.server.listen(port, () => {
    console.log(`${GAME_NAME} server listening on http://localhost:${port}`);
    console.log(`WebSocket server running on ws://localhost:${port}`);
    console.log("虚构娱乐模拟：当前为 MVP 玩法服务，不含真实行情或投资建议。");
  });

  return app;
}

const entryArg = process.argv[1] ?? "";
if (entryArg.endsWith("src/index.ts") || entryArg.endsWith("src\\index.ts")) {
  startServer();
}
