import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const configPath = resolve(".wrangler/config");
mkdirSync(configPath, { recursive: true });
import { createServer } from "vite";
const args = process.argv.slice(2),
  value = (flag, fallback) =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const backendPort = process.env.API_PORT || "8787";
const child = spawn(
  process.execPath,
  [
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    backendPort,
    "--persist-to",
    ".wrangler/state",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      XDG_CONFIG_HOME: configPath,
      WRANGLER_SEND_METRICS: "false",
      WRANGLER_LOG_PATH:
        process.env.WRANGLER_LOG_PATH || "/tmp/synergelab-wrangler.log",
    },
  },
);
let server,
  stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  await server?.close();
  child.kill("SIGTERM");
};
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
child.on("exit", (code) => {
  if (!stopping) {
    stop();
    process.exitCode = code || 1;
  }
});
let ready = false;
for (let i = 0; i < 90; i++) {
  if (stopping) break;
  try {
    if ((await fetch(`http://127.0.0.1:${backendPort}/api/health`)).ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
if (!ready) {
  await stop();
  throw Error("공유 서버를 시작하지 못했습니다. 위 오류를 확인하세요.");
}
server = await createServer({
  server: {
    host: value("--host", "0.0.0.0"),
    port: Number(value("--port", "4173")),
    strictPort: true,
    proxy: { "/api": { target: `http://127.0.0.1:${backendPort}`, ws: true } },
  },
});
await server.listen();
server.printUrls();
