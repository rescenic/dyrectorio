import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { NotificationEventTypeEnum, NotificationTypeEnum } from '@prisma/client'
import { lastValueFrom } from 'rxjs'
import NotificationTemplateBuilder from 'src/builders/notification.template.builder'
import { nameOrEmailOfIdentity } from 'src/domain/identity'
import { NotificationMessageType, NotificationTemplate, getTemplate } from 'src/domain/notification-templates'
import { CruxInternalServerErrorException } from 'src/exception/crux-exception'
import KratosService from './kratos.service'
import PrismaService from './prisma.service'

@Injectable()
export default class DomainNotificationService {
  private readonly logger = new Logger(DomainNotificationService.name)

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private kratos: KratosService,
    private templateBuilder: NotificationTemplateBuilder,
  ) {}

  async sendNotification(template: NotificationTemplate): Promise<void> {
    const eventType = this.getMessageEventFromType(template.messageType)

    const notifications = await this.prisma.notification.findMany({
      include: {
        events: {
          select: {
            event: true,
          },
        },
      },
      where: {
        teamId: template.teamId,
        active: true,
        events: {
          some: {
            event: eventType,
          },
        },
      },
    })

    if (notifications.length > 0) {
      await Promise.all(notifications.map(it => this.send(it.url, it.type, template)))
    }
  }

  private async send(url: string, type: NotificationTypeEnum, temp: NotificationTemplate): Promise<void> {
    const msg = temp.message
    if (!msg.owner) {
      msg.owner = 'Unknown'
    } else if (typeof msg.owner !== 'string') {
      msg.owner = nameOrEmailOfIdentity(msg.owner)
    }

    try {
      const template = this.templateBuilder.processTemplate('notificationTemplates', temp.messageType, temp.message)

      const chatTemplate = getTemplate(type, template.message)

      if (chatTemplate) {
        await lastValueFrom(this.httpService.post(url, chatTemplate))
      }
    } catch (err) {
      this.logger.error(err)
    }
  }

  private getMessageEventFromType(messageType: NotificationMessageType): NotificationEventTypeEnum {
    switch (messageType) {
      case 'node':
        return NotificationEventTypeEnum.nodeAdded
      case 'version':
        return NotificationEventTypeEnum.versionCreated
      case 'invite':
        return NotificationEventTypeEnum.userInvited
      case 'failed-deploy':
        return NotificationEventTypeEnum.deploymentCreated
      case 'successful-deploy':
        return NotificationEventTypeEnum.deploymentCreated
      default:
        throw new CruxInternalServerErrorException({
          property: 'messageType',
          value: messageType,
          message: `Unknown NotificationMessageType '${messageType}'`,
        })
    }
  }
}
