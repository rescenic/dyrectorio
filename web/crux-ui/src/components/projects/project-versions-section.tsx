import { DyoHeading } from '@app/elements/dyo-heading'
import { DyoConfirmationModal } from '@app/elements/dyo-modal'
import DyoWrap from '@app/elements/dyo-wrap'
import useConfirmation from '@app/hooks/use-confirmation'
import { Version } from '@app/models'
import { versionUrl } from '@app/routes'
import useTranslation from 'next-translate/useTranslation'
import VersionCard from './versions/version-card'

interface ProjectVersionsSectionProps {
  projectId: string
  versions: Version[]
  onIncrease?: (version: Version) => void
  onSetAsDefault?: (version: Version) => void
  disabled?: boolean
}

const ProjectVersionsSection = (props: ProjectVersionsSectionProps) => {
  const { projectId, versions, onIncrease, onSetAsDefault, disabled } = props

  const { t } = useTranslation('projects')

  const [modalConfig, confirmSetAsDefault] = useConfirmation()

  const onSetAsDefaultClick = (version: Version) =>
    confirmSetAsDefault(() => onSetAsDefault(version), {
      description: t('setNameAsDefault', version),
    })

  return versions.length ? (
    <>
      <DyoWrap>
        {versions.map((it, index) => (
          <VersionCard
            key={`version-${index}`}
            projectId={projectId}
            version={it}
            disabled={disabled}
            onIncreaseClick={onIncrease ? () => onIncrease(it) : null}
            onSetAsDefaultClick={onSetAsDefault ? () => onSetAsDefaultClick(it) : null}
            href={versionUrl(projectId, it.id)}
          />
        ))}
      </DyoWrap>

      <DyoConfirmationModal config={modalConfig} title={t('common:areYouSure')} />
    </>
  ) : (
    <DyoHeading element="h3" className="text-md text-center text-light-eased pt-32">
      {t('versions:noItems')}
    </DyoHeading>
  )
}

export default ProjectVersionsSection
