import type { APIGatewayProxyResult } from "aws-lambda";

export const ok = (body: unknown): APIGatewayProxyResult => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const created = (body: unknown): APIGatewayProxyResult => ({
  statusCode: 201,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const noContent = (): APIGatewayProxyResult => ({
  statusCode: 204,
  body: "",
});

export const notFound = (message = "Not found"): APIGatewayProxyResult => ({
  statusCode: 404,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ error: message }),
});

export const badRequest = (error: unknown): APIGatewayProxyResult => ({
  statusCode: 400,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ error }),
});

export const serverError = (message = "Internal server error"): APIGatewayProxyResult => ({
  statusCode: 500,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ error: message }),
});
