import 'reflect-metadata';
import { ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Error400 } from 'core/error/error-400';

export abstract class BaseService {
  async validate<T extends {}>(
    cls: ClassConstructor<T>,
    requestDto: T
  ): Promise<T> {
    if (!requestDto) throw new Error400();
    const parsedResponse: T = plainToInstance(cls, requestDto, {
      excludeExtraneousValues: true,
    });
    await validate(parsedResponse).then((errors) => {
      if (errors?.length > 0) {
        console.log(`Validation errors: ${errors.toString()}`);
        throw new Error400(errors.toString());
      }
    });
    return parsedResponse;
  }
}
