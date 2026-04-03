import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { APIGatewayProxyEvent } from "aws-lambda";

// Mock the DynamoDB client before importing the handler
const mockSend = mock(() => Promise.resolve({ Items: [], Item: null }));
mock.module("../src/lib/dynamo", () => ({
  ddb: { send: mockSend },
}));

import { handler } from "../src/handlers/symptoms";

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: "GET",
    path: "/api/symptoms",
    resource: "/api/symptoms",
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    ...overrides,
  };
}

describe("symptoms handler", () => {
  beforeEach(() => {
    mockSend.mockClear();
  });

  it("GET /symptoms returns 200 with items", async () => {
    mockSend.mockResolvedValueOnce({ Items: [{ id: "S001", name: "Fever" }] });

    const res = await handler(makeEvent({ httpMethod: "GET" }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toEqual([{ id: "S001", name: "Fever" }]);
  });

  it("POST /symptoms returns 400 when name is missing", async () => {
    const res = await handler(
      makeEvent({ httpMethod: "POST", body: JSON.stringify({ name: "" }) })
    );
    expect(res.statusCode).toBe(400);
  });

  it("POST /symptoms returns 201 with created item", async () => {
    mockSend.mockResolvedValueOnce({});

    const res = await handler(
      makeEvent({ httpMethod: "POST", body: JSON.stringify({ name: "Nausea" }) })
    );
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.name).toBe("Nausea");
    expect(body.id).toBeDefined();
  });

  it("PUT /symptoms/:id returns 404 when item does not exist", async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    const res = await handler(
      makeEvent({
        httpMethod: "PUT",
        pathParameters: { id: "S999" },
        body: JSON.stringify({ name: "Updated" }),
      })
    );
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /symptoms/:id returns 204", async () => {
    mockSend.mockResolvedValueOnce({});

    const res = await handler(
      makeEvent({ httpMethod: "DELETE", pathParameters: { id: "S001" } })
    );
    expect(res.statusCode).toBe(204);
  });
});
