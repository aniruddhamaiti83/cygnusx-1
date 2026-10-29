#!/usr/bin/env node
/**
 * Start FastAPI on a Unix socket (not TCP) so the live preview sees only :8080.
 * TCP :8000 is a second HTTP server and the preview proxy then refuses to pick a target.
 * Local/Docker can still use TCP via CX1_API_TCP=1 or CX1_API_URL.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import http from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const CX1_SOCK = process.env.CX1_API_SOCK || "/tmp/cx1-api.sock";
const TCP = process.env.CX1_API_TCP === "1" || process.platform === "win32";
const foreground = process.argv.includes("--foreground");

function unixHealthy() {
  if (!existsSync(CX1_SOCK)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const req = http.request(
      { socketPath: CX1_SOCK, path: "/api/cx1/health", method: "GET", timeout: 1500 },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function tcpHealthy() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/cx1/health", { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function healthy() {
  // Use the configured transport exclusively; do not accidentally reuse a
  // stale socket when the process is configured for the TCP proxy.
  if (TCP) return tcpHealthy();
  return unixHealthy();
}

function pythonCandidates() {
  const win = process.platform === "win32";
  const venv = win
    ? join(ROOT, "backend", ".venv", "Scripts", "python.exe")
    : join(ROOT, "backend", ".venv", "bin", "python");
  const list = [];
  if (existsSync(venv)) list.push(venv);
  if (win) list.push("python", "py");
  else list.push("python3", "python");
  return list;
}

function spawnPython(bin, args, opts) {
  if (bin === "py") return spawn("py", ["-3", ...args], opts);
  return spawn(bin, args, opts);
}

function importsUvicorn(bin) {
  return new Promise((resolve) => {
    const child = spawnPython(bin, ["-c", "import uvicorn, fastapi"], {
      cwd: ROOT,
      stdio: "ignore",
    });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function findPython() {
  for (const bin of pythonCandidates()) {
    if (await importsUvicorn(bin)) return bin;
  }
  return null;
}

function uvicornArgs() {
  const runner = join(ROOT, "backend", "runner.py");
  if (TCP) return [runner, "--host", "127.0.0.1", "--port", "8000", "--reload"];
  return [runner, "--uds", CX1_SOCK, "--reload"];
}

function hint() {
  return `
Origination API is not running.

Install and start it (repo root):

  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -r backend/requirements.txt
  npm run api
`.trim();
}

async function startBackground(bin) {
  mkdirSync(join(ROOT, "backend", "data"), { recursive: true });
  if (!TCP) {
    try {
      rmSync(CX1_SOCK);
    } catch {
      /* missing is fine */
    }
  }
  const child = spawnPython(bin, uvicornArgs(), {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  for (let i = 0; i < 40; i += 1) {
    await new Promise((r) => setTimeout(r, 250));
    if (await healthy()) return true;
  }
  return false;
}

function startForeground(bin) {
  mkdirSync(join(ROOT, "backend", "data"), { recursive: true });
  if (!TCP) {
    try {
      rmSync(CX1_SOCK);
    } catch {
      /* missing is fine */
    }
  }
  const child = spawnPython(bin, uvicornArgs(), { cwd: ROOT, stdio: "inherit", env: process.env });
  child.on("exit", (code) => process.exit(code ?? 1));
}

if (await healthy()) {
  console.log(TCP ? "Origination API already running on port 8000." : "Origination API already running on unix socket.");
  process.exit(0);
}

const bin = await findPython();
if (!bin) {
  console.error(hint());
  process.exit(foreground ? 1 : 0);
}

if (foreground) {
  console.log(TCP ? "Starting Origination API on port 8000…" : `Starting Origination API on ${CX1_SOCK}…`);
  startForeground(bin);
} else {
  console.log(TCP ? "Starting Origination API on port 8000…" : `Starting Origination API on ${CX1_SOCK}…`);
  const ok = await startBackground(bin);
  if (ok) console.log("Origination API ready.");
  else console.error(hint());
  process.exit(0);
}
