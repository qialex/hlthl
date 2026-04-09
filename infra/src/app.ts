import * as cdk from "aws-cdk-lib";
import { HlthlStack } from "./stack";

const app = new cdk.App();

new HlthlStack(app, "HlthlStack-Dev", {
  stageName: "dev",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});

new HlthlStack(app, "HlthlStack-Prod", {
  stageName: "prod",
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
