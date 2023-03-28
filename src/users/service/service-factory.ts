import { UserService } from 'users/service/user-service';

export const makeService = (): UserService => {
  return new UserService();
};
