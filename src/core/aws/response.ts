import { APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';
import { readEnvVar } from 'core/env';
import { Error400 } from 'core/error/error-400';
import { Error401 } from 'core/error/error-401';
import { Error403 } from 'core/error/error-403';
import { Error404 } from 'core/error/error-404';
import { Error409 } from 'core/error/error-409';
import { Event } from 'core/aws/types';

const withCors = (
  result: APIGatewayProxyResult,
  origin?: string
): APIGatewayProxyResult => {
  const allowedOrigins: string[] = readEnvVar<string[]>('ALLOWED_ORIGINS');
  if (allowedOrigins.length > 0) {
    if (allowedOrigins[0] === '*') {
      if (!result.headers) {
        result.headers = {};
      }
      result.headers['Access-Control-Allow-Origin'] = '*';
    } else if (origin && allowedOrigins.includes(origin)) {
      if (!result.headers) {
        result.headers = {};
      }
      result.headers['Access-Control-Allow-Origin'] = origin;
      result.headers['Access-Control-Allow-Credentials'] = true;
    }
  }
  return result;
};

export const buildSuccessResponse = <T>(
  event: Event<T>,
  statusCode: number, // 2xx & 3xx
  payload?: unknown,
  headers?: Record<string, boolean | number | string>
): APIGatewayProxyResult => {
  const body = payload ? JSON.stringify(payload) : '';
  const result: APIGatewayProxyResult = { statusCode, body, headers };
  return withCors(result, event?.headers?.origin);
};

export const buildFailureResponse = <T>(
  event: Event<T>,
  error: unknown,
  headers?: Record<string, boolean | number | string>
): APIGatewayProxyResult => {
  // @ts-ignore
  let statusCode = error?.statusCode ?? 500;
  if (error instanceof Error400) statusCode = 400;
  if (error instanceof Error401) statusCode = 401;
  if (error instanceof Error403) statusCode = 403;
  if (error instanceof Error404) statusCode = 404;
  if (error instanceof Error409) statusCode = 409;
  const body = (error as Error)?.message
    ? JSON.stringify({
        error: true,
        message: (error as Error).message,
      })
    : '';
  const result: APIGatewayProxyResult = { statusCode, body, headers };
  return withCors(result, event.headers?.origin);
};
