import { HTTPError } from 'core/error/http-error';

export class Error409 extends HTTPError {} // => Produces 409 response
