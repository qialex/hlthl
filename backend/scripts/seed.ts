import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { Condition, Symptom, ConditionSymptomLink } from "../shared/types";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: "us-east-1",
    endpoint: process.env.DYNAMO_ENDPOINT ?? "http://localhost:8000",
    credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
  })
);

const conditions: Condition[] = [
  { id: "C001", name: "Common Cold" },
  { id: "C002", name: "Influenza" },
  { id: "C003", name: "Migraine" },
];

const symptoms: Symptom[] = [
  { id: "S001", name: "Fever" },
  { id: "S002", name: "Cough" },
  { id: "S003", name: "Sore throat" },
  { id: "S004", name: "Fatigue" },
  { id: "S005", name: "Headache" },
  { id: "S006", name: "Nausea" },
];

const links: ConditionSymptomLink[] = [
  { conditionId: "C001", symptomId: "S002" },
  { conditionId: "C001", symptomId: "S003" },
  { conditionId: "C001", symptomId: "S004" },
  { conditionId: "C002", symptomId: "S001" },
  { conditionId: "C002", symptomId: "S002" },
  { conditionId: "C002", symptomId: "S004" },
  { conditionId: "C002", symptomId: "S005" },
  { conditionId: "C003", symptomId: "S004" },
  { conditionId: "C003", symptomId: "S005" },
  { conditionId: "C003", symptomId: "S006" },
];

async function seed() {
  const { Items = [] } = await ddb.send(
    new ScanCommand({ TableName: "Conditions", Limit: 1 })
  );
  if (Items.length > 0) {
    console.log("Already seeded, skipping.");
    return;
  }
  for (const item of conditions)
    await ddb.send(new PutCommand({ TableName: "Conditions", Item: item }));
  for (const item of symptoms)
    await ddb.send(new PutCommand({ TableName: "Symptoms", Item: item }));
  for (const item of links)
    await ddb.send(new PutCommand({ TableName: "ConditionSymptoms", Item: item }));
  console.log("Seeded successfully.");
}

seed().catch((e) => { console.error(e); process.exit(1); });
