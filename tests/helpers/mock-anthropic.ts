import http from "node:http";

export interface MockCall {
  headers: http.IncomingHttpHeaders;
  body: Record<string, unknown>;
}

/** Minimalny serwer zgodny z POST /v1/messages (SSE), zwracający zadany tekst JSON. */
export function startMockAnthropic(respond: (body: Record<string, unknown>) => { text: string; stopReason?: string }) {
  const calls: MockCall[] = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      calls.push({ headers: req.headers, body });
      const { text, stopReason = "end_turn" } = respond(body);
      const ev = (type: string, data: unknown) => `event: ${type}\ndata: ${JSON.stringify({ type, ...(data as object) })}\n\n`;
      res.writeHead(200, { "content-type": "text/event-stream", "request-id": "req_mock" });
      res.write(ev("message_start", { message: { id: "msg_mock", type: "message", role: "assistant", model: body.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 0 } } }));
      if (stopReason !== "refusal") {
        res.write(ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }));
        for (let i = 0; i < text.length; i += 400) res.write(ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: text.slice(i, i + 400) } }));
        res.write(ev("content_block_stop", { index: 0 }));
      }
      res.write(ev("message_delta", { delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 900 } }));
      res.write(ev("message_stop", {}));
      res.end();
    });
  });
  return new Promise<{ url: string; calls: MockCall[]; close: () => Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      resolve({ url: `http://127.0.0.1:${port}`, calls, close: () => new Promise((r) => server.close(() => r())) });
    });
  });
}
