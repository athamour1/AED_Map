import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request: { user: AuthenticatedUser } = ctx
      .switchToHttp()
      .getRequest();
    return request.user;
  },
);
