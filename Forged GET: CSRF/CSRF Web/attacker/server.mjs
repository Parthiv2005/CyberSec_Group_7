import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const port = Number(process.env.ATTACKER_PORT ?? 3001);
const indexPath = fileURLToPath(new URL("./index.html", import.meta.url));

const server = createServer(async (_request, response) => {
  try {
    const html = await readFile(indexPath, "utf8");
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(html);
  } catch {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("Could not load the attacker page.");
  }
});

server.listen(port, "localhost", () => {
  console.log(`Attacker origin ready at http://localhost:${port}`);
});
