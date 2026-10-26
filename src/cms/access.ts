import type { Access, FieldAccess } from 'payload'

export type Role = 'owner' | 'admin' | 'editor' | 'sales' | 'contributor' | 'client'
export type CMSUser = { id: number | string; role?: Role; email?: string } | null | undefined
export const hasRole = (user: CMSUser, roles: Role[]) => Boolean(user?.role && roles.includes(user.role))
export const isStaff = (user: CMSUser) => hasRole(user, ['owner', 'admin', 'editor', 'sales', 'contributor'])
export const canManage: Access = ({ req }) => hasRole(req.user, ['owner', 'admin'])
export const canEdit: Access = ({ req }) => hasRole(req.user, ['owner', 'admin', 'editor'])
export const canSell: Access = ({ req }) => hasRole(req.user, ['owner', 'admin', 'sales'])
export const staffRead: Access = ({ req }) => isStaff(req.user)
export const publishedRead: Access = ({ req }) => isStaff(req.user) ? true : { _status: { equals: 'published' } }
export const managerField: FieldAccess = ({ req }) => hasRole(req.user, ['owner', 'admin'])
export const ownerField: FieldAccess = ({ req }) => req.user?.role === 'owner'
export const nobody: Access = () => false
