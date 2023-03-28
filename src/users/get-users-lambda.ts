import { APIGatewayProxyEvent } from 'aws-lambda/trigger/api-gateway-proxy';
import { APIGatewayProxyResult } from 'aws-lambda/trigger/api-gateway-proxy';

import { makeService } from 'users/service/service-factory';
import { UserService } from 'users/service/user-service';
import { ResponseUserDto } from 'users/dto/response-dto';
import { buildFailureResponse } from 'core/aws/response';
import { buildSuccessResponse } from 'core/aws/response';

let service: UserService;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`Received new event: ${JSON.stringify(event)}`);

  try {
    if (!service) service = makeService();

    const responseUserDto: ResponseUserDto[] = await service.getUsers();
    return buildSuccessResponse(event, 200, responseUserDto);
  } catch (err: unknown) {
    console.error(JSON.stringify(err));
    return buildFailureResponse(event, err);
  }
};
