import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { ddb } from "../lib/dynamo";
import { NameSchema } from "../../../shared/schemas";
import { ok, created, noContent, notFound, badRequest, serverError } from "../lib/response";
import type { Condition, Symptom, ConditionSymptomLink } from "../../../shared/types";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, pathParameters, body } = event;
  const id = pathParameters?.id;
  const symptomId = pathParameters?.symptomId;

  try {
    // GET /conditions
    if (httpMethod === "GET" && !id) {
      const { Items = [] } = await ddb.send(new ScanCommand({ TableName: "Conditions" }));
      return ok(Items);
    }

    // GET /conditions/:id
    if (httpMethod === "GET" && id && !symptomId && !event.resource.includes("symptoms")) {
      const { Item } = await ddb.send(
        new GetCommand({ TableName: "Conditions", Key: { id } })
      );
      return Item ? ok(Item) : notFound();
    }

    // POST /conditions
    if (httpMethod === "POST" && !id) {
      const parsed = NameSchema.safeParse(JSON.parse(body ?? "{}"));
      if (!parsed.success) return badRequest(parsed.error.flatten());
      const name = parsed.data.name;
      const { Items: existing = [] } = await ddb.send(new ScanCommand({ TableName: "Conditions" }));
      if (existing.some((c: Condition) => c.name.toLowerCase() === name.toLowerCase())) {
        return badRequest("A condition with this name already exists");
      }
      const item: Condition = { id: randomUUID(), name };
      await ddb.send(new PutCommand({ TableName: "Conditions", Item: item }));
      return created(item);
    }

    // PUT /conditions/:id
    if (httpMethod === "PUT" && id) {
      const parsed = NameSchema.safeParse(JSON.parse(body ?? "{}"));
      if (!parsed.success) return badRequest(parsed.error.flatten());
      const name = parsed.data.name;
      const { Item } = await ddb.send(
        new GetCommand({ TableName: "Conditions", Key: { id } })
      );
      if (!Item) return notFound();
      const { Items: existing = [] } = await ddb.send(new ScanCommand({ TableName: "Conditions" }));
      if (existing.some((c: Condition) => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) {
        return badRequest("A condition with this name already exists");
      }
      const updated: Condition = { ...(Item as Condition), name };
      await ddb.send(new PutCommand({ TableName: "Conditions", Item: updated }));
      return ok(updated);
    }

    // DELETE /conditions/:id
    if (httpMethod === "DELETE" && id && !symptomId) {
      await ddb.send(new DeleteCommand({ TableName: "Conditions", Key: { id } }));
      return noContent();
    }

    // GET /conditions/:id/symptoms
    if (httpMethod === "GET" && id && symptomId === undefined && event.resource.includes("symptoms")) {
      const { Items: links = [] } = await ddb.send(
        new QueryCommand({
          TableName: "ConditionSymptoms",
          KeyConditionExpression: "conditionId = :cid",
          ExpressionAttributeValues: { ":cid": id },
        })
      );
      if (!links.length) return ok([]);
      const symptoms = await Promise.all(
        (links as ConditionSymptomLink[]).map(({ symptomId: sid }) =>
          ddb
            .send(new GetCommand({ TableName: "Symptoms", Key: { id: sid } }))
            .then((r) => r.Item as Symptom | undefined)
        )
      );
      return ok(symptoms.filter(Boolean));
    }

    // POST /conditions/:id/symptoms/:symptomId
    if (httpMethod === "POST" && id && symptomId) {
      const [{ Item: condition }, { Item: symptom }] = await Promise.all([
        ddb.send(new GetCommand({ TableName: "Conditions", Key: { id } })),
        ddb.send(new GetCommand({ TableName: "Symptoms", Key: { id: symptomId } })),
      ]);
      if (!condition) return notFound("Condition not found");
      if (!symptom) return notFound("Symptom not found");
      await ddb.send(
        new PutCommand({
          TableName: "ConditionSymptoms",
          Item: { conditionId: id, symptomId },
        })
      );
      return created({ conditionId: id, symptomId });
    }

    // DELETE /conditions/:id/symptoms/:symptomId
    if (httpMethod === "DELETE" && id && symptomId) {
      await ddb.send(
        new DeleteCommand({
          TableName: "ConditionSymptoms",
          Key: { conditionId: id, symptomId },
        })
      );
      return noContent();
    }

    return notFound("Route not found");
  } catch (err) {
    console.error(err);
    return serverError();
  }
};
