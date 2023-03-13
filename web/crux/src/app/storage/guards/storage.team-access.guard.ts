import { Injectable } from '@nestjs/common'
import { Identity } from '@ory/kratos-client'
import { IdRequest } from 'src/grpc/protobuf/proto/crux'
import UserAccessGuard from 'src/shared/user-access.guard'

@Injectable()
export default class StorageTeamAccessGuard extends UserAccessGuard<IdRequest> {
  async canActivateWithRequest(request: IdRequest, identity: Identity): Promise<boolean> {
    if (!request.id) {
      return true
    }

    const storages = await this.prisma.storage.count({
      where: {
        id: request.id,
        team: {
          users: {
            some: {
              userId: identity.id,
              active: true,
            },
          },
        },
      },
    })

    return storages > 0
  }
}