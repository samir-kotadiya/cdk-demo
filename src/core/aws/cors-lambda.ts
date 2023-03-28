import { APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';

/**
 * needed for local development to avoid CORS errors.
 */
export const handler = async (): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 204,
    body: '',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
    },
  };
};
