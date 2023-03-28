/**
 * Contains a list of shared Ids suffixes you have to add the stage
 */
export enum SharedIds {
  REST_API_ID = 'apigw-rest-api-id',
  REST_API_ROOT_RESOURCE_ID = 'apigw-rest-api-root-resource-id',
  REST_API_AUTHORIZER_ID = 'apigw-rest-api-authorizer-id',
  S3_NOTIFICATION_FILE_BUCKET = 'notification-file',
  S3_LEGAL_DOCS_BUCKET = 'legal-documents',
  S3_LEGAL_DOCS_OAI = 's3-legal-documents-oai',
  DB_SCHEMA_NAME = 'merchant',
  DB_RESOURCE_ARN = 'db-resource-arn',
  DB_SECRET_ARN = 'db-secret-arn',
  CT_SECRET_ARN = 'ct-secret-arn',
  CIDK_SECRET_ARN = 'cidk-secret-arn',
  VPC_ID = 'vpc-id',
  PRIVATE_ROUTE_TABLE_IDS = 'private-route-table-ids',
  VPC_LAMBDA_SG_ID = 'lambda-security-group-id',
  TERMINATION_DOC_QUEUE_ARN = 'termination-doc-generator-queue-arn',
  AMQP_SECRET_ARN = 'amqp-secret-arn',
}
