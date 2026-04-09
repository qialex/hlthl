import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import { tables as tableDefs } from "../../shared/tables";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: process.env.DYNAMO_ENDPOINT ?? "http://localhost:8000",
  credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
});

const tables = [
  {
    TableName: tableDefs.conditions.name,
    KeySchema: [{ AttributeName: tableDefs.conditions.partitionKey, KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: tableDefs.conditions.partitionKey, AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: tableDefs.symptoms.name,
    KeySchema: [{ AttributeName: tableDefs.symptoms.partitionKey, KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: tableDefs.symptoms.partitionKey, AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: tableDefs.conditionSymptoms.name,
    KeySchema: [
      { AttributeName: tableDefs.conditionSymptoms.partitionKey, KeyType: "HASH" },
      { AttributeName: tableDefs.conditionSymptoms.sortKey, KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: tableDefs.conditionSymptoms.partitionKey, AttributeType: "S" },
      { AttributeName: tableDefs.conditionSymptoms.sortKey, AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
];

async function migrate() {
  for (let i = 0; i < 10; i++) {
    try {
      await client.send(new ListTablesCommand({}));
      break;
    } catch {
      console.log(`Waiting for DynamoDB... (attempt ${i + 1})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const { TableNames = [] } = await client.send(new ListTablesCommand({}));
  for (const table of tables) {
    if (TableNames.includes(table.TableName)) {
      console.log(`Table ${table.TableName} already exists.`);
      continue;
    }
    await client.send(new CreateTableCommand(table as any));
    console.log(`Created: ${table.TableName}`);
  }
}

migrate().catch((e) => { console.error(e); process.exit(1); });
