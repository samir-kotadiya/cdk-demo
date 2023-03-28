import { HTTPError } from 'core/error/http-error';

export class Error401 extends HTTPError {} // => Produces 401 response
