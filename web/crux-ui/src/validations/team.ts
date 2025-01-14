import { UserRole, USER_ROLE_VALUES } from '@app/models/user'
import * as yup from 'yup'
import { identityNameRule, nameRule } from './common'

export const inviteUserSchema = yup.object().shape({
  email: yup.string().email().required(),
  firstName: identityNameRule.required(),
  lastName: identityNameRule.min(0),
})

export const selectTeamSchema = yup.object().shape({
  id: yup.string().required(),
})

export const createTeamSchema = yup.object().shape({
  name: nameRule,
})

export const updateTeamSchema = createTeamSchema

export const roleSchema = yup.mixed<UserRole>().oneOf([...USER_ROLE_VALUES])
