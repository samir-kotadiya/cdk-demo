import { HTTPError } from 'core/error/http-error';

export class Error403 extends HTTPError {} // => Produces 403 response
