# Test Merchant Service

This repository contains all the back-end code of the Test Service.

## Bundle

We use esbuild to compile and bundle the source code.

Check out our configuration [here](esbuild.ts) and the documentation [here](https://esbuild.github.io/).

`treeShaking` -  used to reduce final bundle size by removing unused code.

`mainFields` - used to tell esbuild which fields it should prioritize when importing a library/package.
Some libraries support both .cjs and .mjs format. .mjs is preferred where possible due to better tree-shaking support.

`externals` - tells esbuild which libraries/packages it should not bundle. Example: aws-sdk.

## AWS-SDK

The Lambda runtime environment provides the `aws-sdk` dependency, so it is not bundled. This helps keep the bundle size as
small as possible.

**Make sure that the version installed as devDependency is the same as the one provided at runtime.**
> https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## CDK ( IaaC )

Our infrastructure is split into two CDK apps:
* [infrastrucure-app](cdk/infrastructure/infra.ts)
* [backend-app](cdk/backend/backend-app.ts)

Each app creates multiple stacks:

- Infra: RDS stack, S3 stack, API GW stack, e.t.c
- Backend: Lambda stack, Deployment Stack e.t.c

Note:
> [ LOCAL DEVELOPMENT ] Due to limitation of sam, the lambda-stack is disabled for now and all Lambda constructs are 'owned' by API GW Stack

## DB Versioning
Knex is used for versioning of the DB.

The versioning is split in two parts: additions and removals.

Additions are changes that do not brake the existing code (adding a new table, adding a new column to an existing table e.t.c.).

Removals are changes that would break the code, so the code changes should be deployed first. (removing a column from a table, removing a table e.t.c)

> Check `predeploy` and `postdeploy` npm scripts to see the steps of DB versioning.


## Scripts

`npm run build` - checks for tsc errors

`npm run bundle` - compiles and bundles the code

`npm run infra` - starts deploy of CDK infrastructure app

`npm run deploy` - bundles the code and starts deploy of CDK backend app

`npm run test:unit` - runs all unit tests

## Configuration

#### DB 
There are three parameters needed to connect the AWS Aurora Serverless instance.

When provisioning the database for the first time, 
these parameters are stored automatically in AWS Parameter Store (Systems Manager).

When deploying lambdas that need DB access, the parameters are imported from there and injected as env variables.

## Local development

#### Prerequisites
- Node 16
- Docker
- sam cli

#### Postman collection
https://planetary-sunset-244396.postman.co/workspace/Veemo-API~ddac532d-fb01-43f7-81d5-ba29d7e28cbe/collection/12480358-d4651ff0-3aa2-4641-bd8f-a6db8f73f4cb?action=share&creator=12480358

#### Scripts
`npm run local` - will start the local development environmet by calling all `local:*` scripts

`npm run local:db` - will start the DB (docker image) and migrate DB to the latest version (see [DB Versioning](#db-versioning))

`npm run local:s3` - will start the S3 (localstack docker image) (see [Localstack configuration](#localstack))

`npm run local:bundle` - will bundle the code (watch mode)

`npm run local:api` - will use the bundled code and start the local api

#### Configuration

All the configurations should go into [locals.json](cdk/locals.json)

#### localstack
We are used localstack with docker to test AWS services locally like s3.
You can find more details here - `https://localstack.cloud`

Step to run localstack locally

- first you need to create localstack aws profile with dummy keys

- Run `aws configure --profile localstack` it will ask you aws details where you can provide dummy data.

- Run `npm run local:localstack`

Create bucket after running the docker container by below command in terminal
- `aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket local-s3-notification-file-bucket --profile localstack`

Check bucket list run below command in terminal
- `aws --endpoint-url=http://localhost:4566 s3api list-buckets --profile localstack`

Create SQS Queue after running the docker container by below command in terminal
- `aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name sample-queue --profile localstack`

Check SQS Queue list run below command in terminal
- `aws --endpoint-url=http://localhost:4566 sqs list-queues --profile localstack`

Check SQS Queue messages run below command in terminal
- `aws --endpoint-url=http://localhost:4566 sqs receive-message --queue-url http://localhost:4566/000000000000/sample-queue --profile localstack`

in above all aws command we have used --profile to use dummy localstack aws cred.

--- 

## Set up a new stage

1. Base domain should be manually set up in Route 53 first
2. Set domain name in the [util.ts](cdk/util.ts)
3. Manually configure the required secrets (see [Required Secrets](#required-secrets))
4. Run `npm run bundle` to bundle the code
5. Run `npm run infra` to prepare the infrastructure
6. Run `npm run deploy:all` to deploy the backend

Optional:
> For steps 4,5 and 6, a `STAGE` env variable can be set. Example: `STAGE=pre npm run infra` 

#### AWS event bridge setup with CloudAMQP
We are consuming product change event from CloudAMQP `https://www.cloudamqp.com` queue and it provides the integration with AWS event bridge to get the message and process it using aws lambda

To set up AWS event bridge with cloudAMQP the following steps are required:

1. Login into CloudAMQP
2. Find the instance and click on instance name from the instance list. it will redirect you to intance overview page
3. Click on INTEGRATION from the left menu and than click on AWS EVENTBRIDGE sub menu
4. Enter VHost, Queue, AWS Region, AWS Account ID (do not checked Header checkbox)
5. Click on create. it will create AWS Eventbridge integration and also create the Partner event sources in your AWS account autometically with status as pending


Perform below step on AWS Account
1. Login into AWS console
2. Find Amazon EventBridge from service list and click on it
3. Go to Integration -> Partner event sources from left menu. you can see one Partner event sources in the list with postfix as your queue name with status pending
4. Click on your Partner event sources from the list it will redirect you detail page
5. Click on Partner event sources button at top. it will create the event bus and assicate that bus with partner event source
6. Go to events from left menu and find event bus with postfix as you queue name and click on that
7. Copy Event bus ARN and use it in CDK code to create the rule to route the message into lambda

You can test lambda logs by publishing the message from rabbitMQ



### Special deploy steps for clam-av stack

The clam-av stack provides the required antivirus for scanning of PDF legal documents.
Because this stack has `docker` as a dependency, it cannot be deployed from the Jenkins pipeline.

Currently, it can only be deployed manually from a local device (i.e: developer laptop), by running the 
`npm run deploy:all`. The pipeline is set up to deploy all other stacks by calling `npm run deploy`.
