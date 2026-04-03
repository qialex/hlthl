import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: process.env.DYNAMO_ENDPOINT ?? "http://localhost:8000",
  credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
});

const tables = [
  {
    TableName: "Conditions",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "Symptoms",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "ConditionSymptoms",
    KeySchema: [
      { AttributeName: "conditionId", KeyType: "HASH" },
      { AttributeName: "symptomId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "conditionId", AttributeType: "S" },
      { AttributeName: "symptomId", AttributeType: "S" },
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
