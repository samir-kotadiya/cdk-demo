// https://github.com/microsoft/TypeScript/issues/13965
export class HTTPError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
