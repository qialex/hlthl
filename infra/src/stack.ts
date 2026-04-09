import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import * as path from "path";
import { tables as tableDefs } from "../../shared/tables";

export interface HlthlStackProps extends cdk.StackProps {
  stageName: "dev" | "prod";
}

export class HlthlStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HlthlStackProps) {
    super(scope, id, props);

    const { stageName } = props;
    const isProd = stageName === "prod";

    // ─── DynamoDB Tables ────────────────────────────────────────────────

    const conditionsTable = new dynamodb.Table(this, "ConditionsTable", {
      tableName: `${tableDefs.conditions.name}-${stageName}`,
      partitionKey: { name: tableDefs.conditions.partitionKey, type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: isProd
        ? { pointInTimeRecoveryEnabled: true }
        : undefined,
    });

    const symptomsTable = new dynamodb.Table(this, "SymptomsTable", {
      tableName: `${tableDefs.symptoms.name}-${stageName}`,
      partitionKey: { name: tableDefs.symptoms.partitionKey, type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: isProd
        ? { pointInTimeRecoveryEnabled: true }
        : undefined,
    });

    const conditionSymptomsTable = new dynamodb.Table(this, "ConditionSymptomsTable", {
      tableName: `${tableDefs.conditionSymptoms.name}-${stageName}`,
      partitionKey: { name: tableDefs.conditionSymptoms.partitionKey, type: dynamodb.AttributeType.STRING },
      sortKey: { name: tableDefs.conditionSymptoms.sortKey, type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: isProd
        ? { pointInTimeRecoveryEnabled: true }
        : undefined,
    });

    // ─── Lambda Functions ────────────────────────────────────────────────

    const backendPath = path.join(__dirname, "../../backend");

    const commonLambdaProps: Omit<lambda.FunctionProps, "handler"> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(backendPath, {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            "bash", "-c",
            "npm install -g bun && bun build src/handlers/conditions.ts src/handlers/symptoms.ts --outdir /asset-output --target node --format cjs --external aws-sdk",
          ],
        },
      }),
      timeout: cdk.Duration.seconds(10),
      environment: {
        NODE_ENV: "production",
        STAGE: stageName,
        CONDITIONS_TABLE: conditionsTable.tableName,
        SYMPTOMS_TABLE: symptomsTable.tableName,
        CONDITION_SYMPTOMS_TABLE: conditionSymptomsTable.tableName,
      },
    };

    const conditionsLambda = new lambda.Function(this, "ConditionsFunction", {
      ...commonLambdaProps,
      handler: "conditions.handler",
      functionName: `hlthl-conditions-${stageName}`,
    });

    const symptomsLambda = new lambda.Function(this, "SymptomsFunction", {
      ...commonLambdaProps,
      handler: "symptoms.handler",
      functionName: `hlthl-symptoms-${stageName}`,
    });

    // Grant Lambda functions read/write access to tables
    conditionsTable.grantReadWriteData(conditionsLambda);
    symptomsTable.grantReadWriteData(conditionsLambda);
    conditionSymptomsTable.grantReadWriteData(conditionsLambda);

    symptomsTable.grantReadWriteData(symptomsLambda);
    conditionsTable.grantReadWriteData(symptomsLambda);
    conditionSymptomsTable.grantReadWriteData(symptomsLambda);

    // ─── API Gateway ─────────────────────────────────────────────────────

    const api = new apigateway.RestApi(this, "HlthlApi", {
      restApiName: `hlthl-api-${stageName}`,
      deployOptions: {
        stageName,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type"],
      },
    });

    const conditionsIntegration = new apigateway.LambdaIntegration(conditionsLambda);
    const symptomsIntegration = new apigateway.LambdaIntegration(symptomsLambda);

    // /conditions
    const conditions = api.root.addResource("conditions");
    conditions.addMethod("GET", conditionsIntegration);
    conditions.addMethod("POST", conditionsIntegration);

    // /conditions/{id}
    const conditionById = conditions.addResource("{id}");
    conditionById.addMethod("GET", conditionsIntegration);
    conditionById.addMethod("PUT", conditionsIntegration);
    conditionById.addMethod("DELETE", conditionsIntegration);

    // /conditions/{id}/symptoms
    const conditionSymptoms = conditionById.addResource("symptoms");
    conditionSymptoms.addMethod("GET", conditionsIntegration);

    // /conditions/{id}/symptoms/{symptomId}
    const conditionSymptomById = conditionSymptoms.addResource("{symptomId}");
    conditionSymptomById.addMethod("POST", conditionsIntegration);
    conditionSymptomById.addMethod("DELETE", conditionsIntegration);

    // /symptoms
    const symptoms = api.root.addResource("symptoms");
    symptoms.addMethod("GET", symptomsIntegration);
    symptoms.addMethod("POST", symptomsIntegration);

    // /symptoms/{id}
    const symptomById = symptoms.addResource("{id}");
    symptomById.addMethod("GET", symptomsIntegration);
    symptomById.addMethod("PUT", symptomsIntegration);
    symptomById.addMethod("DELETE", symptomsIntegration);

    // /symptoms/{id}/conditions
    const symptomConditions = symptomById.addResource("conditions");
    symptomConditions.addMethod("GET", symptomsIntegration);

    // /symptoms/{id}/conditions/{conditionId}
    const symptomConditionById = symptomConditions.addResource("{conditionId}");
    symptomConditionById.addMethod("POST", symptomsIntegration);
    symptomConditionById.addMethod("DELETE", symptomsIntegration);

    // ─── Frontend (S3 + CloudFront) ───────────────────────────────────────

    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new cloudfront.Distribution(this, "FrontendDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "FrontendDeployment", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../frontend"), {
        bundling: {
          image: cdk.DockerImage.fromRegistry("oven/bun:1"),
          command: [
            "bash", "-c",
            `cd /asset-input && bun install && VITE_API_URL=${api.url} bun run build && cp -r dist/. /asset-output/`,
          ],
        },
      })],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // ─── Outputs ──────────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: `API Gateway URL (${stageName})`,
    });

    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `https://${distribution.distributionDomainName}`,
      description: `CloudFront URL (${stageName})`,
    });
  }
}
