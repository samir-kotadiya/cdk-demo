import { Error404 } from 'core/error/error-404';
import { Error400 } from 'core/error/error-400';
import { BaseService } from 'core/service/base-service';
import { RequestUserDto } from 'users/dto/request-dto';
import { ResponseUserDto } from 'users/dto/response-dto';

const data: ResponseUserDto[] = [
  {
    id: 1,
    name: "samir",
    email: 'samir@gmail.com',
  },
];
export class UserService extends BaseService {
  constructor() {
    // use for class member initialise and type
    super();
  }

  async createUser(requestUserDto: RequestUserDto): Promise<ResponseUserDto> {
    const validatedRequestUserDto: RequestUserDto = await this.validate(
      RequestUserDto,
      requestUserDto
    );

    data.push(validatedRequestUserDto as ResponseUserDto);

    console.info(`New Email Created: ${validatedRequestUserDto.email}`);
    return validatedRequestUserDto as ResponseUserDto;
  }

  async getUsers(): Promise<ResponseUserDto[]> {
    return data;
  }

  async getUser(id: number): Promise<ResponseUserDto> {
    // find user
    const user = data.find((item) => item.id === id);

    if (!user) {
      throw new Error404('user not found');
    }

    return user;
  }
}
