import { createParamDecorator, ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Identity, Session } from '@ory/kratos-client'
import http from 'http'
import KratosService from 'src/services/kratos.service'
import { AuthPayload } from 'src/shared/models'

@Injectable()
export default class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private kratos: KratosService) {
    super()
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest() as ExtendedHttpRequest

    if (req.headers.cookie?.includes('ory_kratos_session=')) {
      try {
        // check the cookie for a valid session
        const session = await this.kratos.getSessionByCookie(req.headers.cookie)
        req.session = session
        return true
      } catch {
        /* ignored */
      }
    }

    const activated = await (super.canActivate(context) as Promise<boolean>)

    if (activated) {
      const userId = req.user.data.sub
      try {
        req.session.identity = await this.kratos.getIdentityById(userId)
      } catch {
        return false
      }
    }

    return activated
  }
}

type ExtendedHttpRequest = http.IncomingMessage & {
  session: Session
  user: {
    data: AuthPayload
  }
}

export const sessionOfContext = (context: ExecutionContext): Session => {
  const req = context.switchToHttp().getRequest() as ExtendedHttpRequest
  return req.session
}

export const identityOfContext = (context: ExecutionContext): Identity => sessionOfContext(context).identity

export const IdentityFromRequest = createParamDecorator(
  (_: unknown, context: ExecutionContext): Identity => identityOfContext(context),
)

export const SessionFromRequest = createParamDecorator(
  (_: unknown, context: ExecutionContext): Session => sessionOfContext(context),
)
