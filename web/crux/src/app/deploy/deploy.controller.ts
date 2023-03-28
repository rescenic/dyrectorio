import { Controller } from '@nestjs/common'
import { concatAll, from, Observable } from 'rxjs'
import { AuditLogLevel } from 'src/decorators/audit-logger.decorator'
import UseGrpcInterceptors from 'src/decorators/grpc-interceptors.decorator'
import {
  CruxDeploymentController,
  CruxDeploymentControllerMethods,
  DeploymentEditEventMessage,
  DeploymentProgressMessage,
  IdRequest,
  ServiceIdRequest,
} from 'src/grpc/protobuf/proto/crux'
import { DisableAccessCheck, DisableIdentity } from 'src/shared/user-access.guard'
import DeployService from './deploy.service'

@Controller()
@CruxDeploymentControllerMethods()
@UseGrpcInterceptors()
export default class DeployController implements CruxDeploymentController {
  constructor(private service: DeployService) {}

  @DisableAccessCheck()
  @DisableIdentity()
  @AuditLogLevel('disabled')
  subscribeToDeploymentEvents(request: IdRequest): Observable<DeploymentProgressMessage> {
    return from(this.service.subscribeToDeploymentEvents(request)).pipe(concatAll())
  }

  @DisableAccessCheck()
  @DisableIdentity()
  @AuditLogLevel('disabled')
  subscribeToDeploymentEditEvents(request: ServiceIdRequest): Observable<DeploymentEditEventMessage> {
    return this.service.subscribeToDeploymentEditEvents(request)
  }
}
