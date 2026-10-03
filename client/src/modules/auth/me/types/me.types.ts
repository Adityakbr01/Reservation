export interface UpdateMePayload {
  name?: string;
  avatar?: File;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
