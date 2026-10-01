import { existsSync } from "node:fs";
import http from "node:http";
import { createFileRoute } from "@tanstack/react-router";

const SOCK = process.env.CX1_API_SOCK || "/tmp/cx1-api.sock";

function apiHosts(): string[] {
  const fromEnv = process.env.CX1_API_URL?.replace(/\/$/, "");
  const hosts = [fromEnv, "http://127.0.0.1:8000", "http://localhost:8000"];
  return [...new Set(hosts.filter(Boolean))] as string[];
}

function hopHeaders(request: Request): Headers {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("accept-encoding");
  return headers;
}

function unixProxy(src: URL, request: Request, headers: Headers, body?: ArrayBuffer): Promise<Response> {
  return new Promise((resolve, reject) => {
    const hdrs: http.OutgoingHttpHeaders = {};
    headers.forEach((value, key) => {
      hdrs[key] = value;
    });
    const req = http.request(
      {
        socketPath: SOCK,
        path: `${src.pathname}${src.search}`,
        method: request.method,
        headers: hdrs,
        timeout: 30000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c as Buffer));
        res.on("end", () => {
          const out = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (!value || key === "transfer-encoding") continue;
            out.set(key, Array.isArray(value) ? value.join(", ") : value);
          }
          resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 502, headers: out }));
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    if (body) req.write(Buffer.from(body));
    req.end();
  });
}

async function proxy({ request }: { request: Request }) {
  const src = new URL(request.url);
  const headers = hopHeaders(request);
  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }
  if (existsSync(SOCK)) {
    try {
      return await unixProxy(src, request, headers, body);
    } catch {
      /* fall through to TCP */
    }
  }
  for (const host of apiHosts()) {
    try {
      const init: RequestInit = {
        method: request.method,
        headers,
        redirect: "manual",
      };
      if (body !== undefined) init.body = body;
      const res = await fetch(`${host}${src.pathname}${src.search}`, init);
      const out = new Headers(res.headers);
      out.delete("transfer-encoding");
      return new Response(res.body, { status: res.status, headers: out });
    } catch {
      /* try the next host */
    }
  }
  return Response.json(
    {
      detail: "Origination API is not running. Refresh in a moment — the API starts with the app.",
    },
    { status: 503 },
  );
}

export const Route = createFileRoute("/api/cx1/$")({
  server: {
    handlers: {
      GET: proxy,
      POST: proxy,
      PUT: proxy,
      PATCH: proxy,
      DELETE: proxy,
    },
  },
});
