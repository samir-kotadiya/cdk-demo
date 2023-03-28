import { Context } from 'aws-lambda';
import { APIGatewayAuthorizerResult } from 'aws-lambda';
import { APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';

import { readEnvVar } from 'core/env';
import { Error403 } from 'core/error/error-403';

export const verifyAuthToken = async (
  token: string
): Promise<jwt.JwtPayload | undefined> => {
  // Returns a Promise with verification result or error
  return new Promise((resolve, reject) =>
    jwt.verify(
      token,
      readEnvVar('SECRET'),
      { complete: true },
      (err: any, decoded: jwt.JwtPayload | undefined) => {
        return err ? reject(err) : resolve(decoded);
      }
    )
  );
};

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  context: Context
): Promise<APIGatewayAuthorizerResult> => {
  console.log(context);
  console.log(`Received new event: ${JSON.stringify(event)}`);

  try {
    if (!event.authorizationToken) {
      throw new Error('No token provided');
    }
    const tokenParts = event.authorizationToken.split(' ');
    const tokenValue = tokenParts[1];
    if (!(tokenParts[0].toLowerCase() === 'bearer' && tokenValue)) {
      throw new Error('No bearer token provided');
    }

    const jwtPayload: jwt.JwtPayload | undefined = await verifyAuthToken(
      tokenValue
    );
    if (!jwtPayload) {
      throw new Error('No payload');
    }
    console.log(`jwtPayload: ${JSON.stringify(jwtPayload)}`);

    return {
      principalId: jwtPayload?.payload?.originalIdP?.context || 'token',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*',
          },
        ],
      },
      context: {
        roles: jwtPayload?.payload?.roles?.toString() || '',
        scopes: jwtPayload?.payload?.scp || '',
        locale: jwtPayload?.payload?.originalIdP?.locale || '',
        country: jwtPayload?.payload?.country || '',
        sub:
          jwtPayload?.payload?.originalIdP?.sub ??
          jwtPayload?.payload?.sub ??
          '',
      },
    };
  } catch (e) {
    console.log(`handler. Invalid token! ${JSON.stringify(e)}`);
    // 401 Unauthorized
    return {
      principalId: 'invalid token',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*',
          },
        ],
      },
    };
  }
};
