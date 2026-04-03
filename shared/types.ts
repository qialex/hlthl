export interface Condition {
  id: string;
  name: string;
}

export interface Symptom {
  id: string;
  name: string;
}

export interface ConditionSymptomLink {
  conditionId: string;
  symptomId: string;
}
