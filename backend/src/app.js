import express from "express";
import { Queue, RuleError } from "./queue.js";

export function createApp(queue = new Queue()) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));
  app.get("/api/health", async (_req, res) =>
    res.json({
      status: "ok",
      ...(queue.health ? await queue.health() : { storage: "memory" }),
    }),
  );
  app.get("/api/state", async (_req, res) => res.json(await queue.snapshot()));
  app.post("/api/tickets", async (req, res) =>
    res.status(201).json(await queue.issue(req.body?.type)),
  );
  app.post("/api/calls", async (req, res) =>
    res.json(await queue.callNext(req.body?.desk)),
  );
  app.post("/api/tickets/:id/:action", async (req, res) =>
    res.json(await queue.action(req.params.id, req.params.action)),
  );
  app.use((err, _req, res, _next) => {
    if (err instanceof RuleError)
      return res.status(400).json({ message: err.message });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ message: "JSON inválido." });
    if (err.type === "entity.too.large")
      return res.status(413).json({ message: "Requisição muito grande." });
    res
      .status(503)
      .json({
        message:
          "Banco de dados indisponível. Tente novamente após a reconexão.",
      });
  });
  return app;
}
