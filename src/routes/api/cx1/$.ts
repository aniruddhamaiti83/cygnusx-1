import { createFileRoute } from "@tanstack/react-router";

const API = "http://127.0.0.1:8000";

async function proxy({ request }: { request: Request }) {
  const src = new URL(request.url);
  const target = `${API}${src.pathname}${src.search}`;
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  try {
    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: "manual",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }
    const res = await fetch(target, init);
    const out = new Headers(res.headers);
    out.delete("transfer-encoding");
    return new Response(res.body, { status: res.status, headers: out });
  } catch {
    return Response.json(
      { detail: "Origination API is not running. Start FastAPI on port 8000." },
      { status: 503 },
    );
  }
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
