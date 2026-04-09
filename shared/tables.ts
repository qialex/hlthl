export const tables = {
  conditions: {
    name: "Conditions",
    partitionKey: "id",
  },
  symptoms: {
    name: "Symptoms",
    partitionKey: "id",
  },
  conditionSymptoms: {
    name: "ConditionSymptoms",
    partitionKey: "conditionId",
    sortKey: "symptomId",
  },
} as const;
