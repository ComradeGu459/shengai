import { Type, type Static } from '@sinclair/typebox';

const Uuid = Type.String({ format: 'uuid' });
const Timestamp = Type.String({ format: 'date-time' });

export const EmployeeAuthLoginBodySchema = Type.Object({
  username: Type.String({ minLength: 1, maxLength: 128 }),
  password: Type.String({ minLength: 1, maxLength: 512 }),
}, { additionalProperties: false });
export type EmployeeAuthLoginBody = Static<typeof EmployeeAuthLoginBodySchema>;

export const EmployeeAuthSessionSchema = Type.Object({
  subject: Type.String({ minLength: 1, maxLength: 128 }),
  expiresAt: Timestamp,
  requestId: Uuid,
}, { additionalProperties: false });
export type EmployeeAuthSession = Static<typeof EmployeeAuthSessionSchema>;

export const EmployeeAuthLogoutSchema = Type.Object({
  loggedOut: Type.Literal(true),
  requestId: Uuid,
}, { additionalProperties: false });
export type EmployeeAuthLogout = Static<typeof EmployeeAuthLogoutSchema>;
