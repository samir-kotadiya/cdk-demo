import { Expose, Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestUserDto {
  @Expose()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Expose()
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  email!: string;
}
