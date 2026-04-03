import express from "express";
import cors from "cors";
import path from "path";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler as conditionsHandler } from "./handlers/conditions";
import { handler as symptomsHandler } from "./handlers/symptoms";

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Adapts an Express request into an APIGatewayProxyEvent, invokes the
 * Lambda handler, and writes the result back to the Express response.
 * This shim is only used locally — in production the same handlers run
 * directly on Lambda behind API Gateway.
 */
function adapt(
  handler: (event: APIGatewayProxyEvent) => Promise<{ statusCode: number; headers?: Record<string, string>; body: string }>
) {
  return async (req: express.Request, res: express.Response) => {
    const event = {
      httpMethod: req.method,
      path: req.path,
      resource: req.route?.path ?? req.path,
      pathParameters: req.params as Record<string, string>,
      queryStringParameters: req.query as Record<string, string>,
      headers: req.headers as Record<string, string>,
      body: req.body ? JSON.stringify(req.body) : null,
      isBase64Encoded: false,
    } as APIGatewayProxyEvent;

    const result = await handler(event);
    res
      .status(result.statusCode)
      .set(result.headers ?? {})
      .send(result.body || undefined);
  };
}

// Conditions routes
app.get("/api/conditions", adapt(conditionsHandler));
app.post("/api/conditions", adapt(conditionsHandler));
app.get("/api/conditions/:id", adapt(conditionsHandler));
app.put("/api/conditions/:id", adapt(conditionsHandler));
app.delete("/api/conditions/:id", adapt(conditionsHandler));
app.get("/api/conditions/:id/symptoms", adapt(conditionsHandler));
app.post("/api/conditions/:id/symptoms/:symptomId", adapt(conditionsHandler));
app.delete("/api/conditions/:id/symptoms/:symptomId", adapt(conditionsHandler));

// Symptoms routes
app.get("/api/symptoms", adapt(symptomsHandler));
app.post("/api/symptoms", adapt(symptomsHandler));
app.get("/api/symptoms/:id", adapt(symptomsHandler));
app.put("/api/symptoms/:id", adapt(symptomsHandler));
app.delete("/api/symptoms/:id", adapt(symptomsHandler));
app.get("/api/symptoms/:id/conditions", adapt(symptomsHandler));
app.post("/api/symptoms/:id/conditions/:conditionId", adapt(symptomsHandler));
app.delete("/api/symptoms/:id/conditions/:conditionId", adapt(symptomsHandler));

// Serve frontend
app.use(express.static(path.join(__dirname, "../../public")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../public/index.html"));
});

const PORT = process.env.PORT ?? 3002;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
