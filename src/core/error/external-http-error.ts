import { HTTPError } from 'core/error/http-error';

export class ExternalHttpError extends HTTPError {
  private statusCode: number | undefined;
  private data: unknown;

  constructor(message: string, statusCode: number | undefined, data: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}
