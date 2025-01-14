import { ProjectType } from './project'

export type Template = {
  id: string
  name: string
  description?: string
  technologies: string[]
}

export type CreateProjectFromTemplate = Omit<Template, 'technologies'> & {
  type: ProjectType
}
