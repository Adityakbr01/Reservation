import type { UserRole } from "../modules/users/user.types";

/** Identity attached to the request by the authenticate middleware. */
export interface RequestUser {
  id: string;
  role: UserRole;
}
