import { APIGatewayProxyEvent } from 'aws-lambda/trigger/api-gateway-proxy';
import { APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';

export type TBodyEvent<T> = Omit<APIGatewayProxyEvent, 'body'> & { body: T };
export type Event<T> = APIGatewayProxyEvent | TBodyEvent<T>;

export type Handler<T> = (event: Event<T>) => Promise<APIGatewayProxyResult>;
