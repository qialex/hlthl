import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
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
  const conditionId = pathParameters?.conditionId;

  try {
    // GET /symptoms
    if (httpMethod === "GET" && !id) {
      const { Items = [] } = await ddb.send(new ScanCommand({ TableName: "Symptoms" }));
      return ok(Items);
    }

    // GET /symptoms/:id
    if (httpMethod === "GET" && id && !event.resource.includes("conditions")) {
      const { Item } = await ddb.send(
        new GetCommand({ TableName: "Symptoms", Key: { id } })
      );
      return Item ? ok(Item) : notFound();
    }

    // POST /symptoms
    if (httpMethod === "POST" && !id) {
      const parsed = NameSchema.safeParse(JSON.parse(body ?? "{}"));
      if (!parsed.success) return badRequest(parsed.error.flatten());
      const item: Symptom = { id: randomUUID(), name: parsed.data.name };
      await ddb.send(new PutCommand({ TableName: "Symptoms", Item: item }));
      return created(item);
    }

    // PUT /symptoms/:id
    if (httpMethod === "PUT" && id) {
      const parsed = NameSchema.safeParse(JSON.parse(body ?? "{}"));
      if (!parsed.success) return badRequest(parsed.error.flatten());
      const { Item } = await ddb.send(
        new GetCommand({ TableName: "Symptoms", Key: { id } })
      );
      if (!Item) return notFound();
      const updated: Symptom = { ...(Item as Symptom), name: parsed.data.name };
      await ddb.send(new PutCommand({ TableName: "Symptoms", Item: updated }));
      return ok(updated);
    }

    // DELETE /symptoms/:id
    if (httpMethod === "DELETE" && id && !conditionId) {
      await ddb.send(new DeleteCommand({ TableName: "Symptoms", Key: { id } }));
      return noContent();
    }

    // GET /symptoms/:id/conditions
    if (httpMethod === "GET" && id && event.resource.includes("conditions")) {
      const { Items: links = [] } = await ddb.send(
        new ScanCommand({
          TableName: "ConditionSymptoms",
          FilterExpression: "symptomId = :sid",
          ExpressionAttributeValues: { ":sid": id },
        })
      );
      if (!links.length) return ok([]);
      const conditions = await Promise.all(
        (links as ConditionSymptomLink[]).map(({ conditionId: cid }) =>
          ddb
            .send(new GetCommand({ TableName: "Conditions", Key: { id: cid } }))
            .then((r) => r.Item as Condition | undefined)
        )
      );
      return ok(conditions.filter(Boolean));
    }

    // POST /symptoms/:id/conditions/:conditionId
    if (httpMethod === "POST" && id && conditionId) {
      const [{ Item: symptom }, { Item: condition }] = await Promise.all([
        ddb.send(new GetCommand({ TableName: "Symptoms", Key: { id } })),
        ddb.send(new GetCommand({ TableName: "Conditions", Key: { id: conditionId } })),
      ]);
      if (!symptom) return notFound("Symptom not found");
      if (!condition) return notFound("Condition not found");
      await ddb.send(
        new PutCommand({
          TableName: "ConditionSymptoms",
          Item: { conditionId, symptomId: id },
        })
      );
      return created({ conditionId, symptomId: id });
    }

    // DELETE /symptoms/:id/conditions/:conditionId
    if (httpMethod === "DELETE" && id && conditionId) {
      await ddb.send(
        new DeleteCommand({
          TableName: "ConditionSymptoms",
          Key: { conditionId, symptomId: id },
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
