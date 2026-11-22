import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const filename = "tplink-deco-mesh-card.js";
const module = [`../dist/${filename}`, "text/javascript"];
const files = new Map([
  ["/demo/", ["../demo/index.html", "text/html"]],
  ["/demo/index.html", ["../demo/index.html", "text/html"]],
  ["/demo/demo.js", ["../demo/demo.js", "text/javascript"]],
  [`/dist/${filename}`, module],
  [`/local/community/ha-tplink-card/${filename}`, module],
]);

const port = Number(process.env.DECO_PORT ?? 4173);
createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://127.0.0.1");
  if (pathname === "/" || pathname === "/demo") {
    response.writeHead(302, { Location: "/demo/" }).end();
    return;
  }
  const file = files.get(pathname);
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }
  const [path, type] = file;
  try {
    const content = await readFile(new URL(path, import.meta.url));
    response
      .writeHead(200, { "Content-Type": type + "; charset=utf-8" })
      .end(content);
  } catch {
    response.writeHead(500).end("Demo file unavailable");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Demo: http://127.0.0.1:${port}/demo/`),
);
