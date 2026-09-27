export type RmsRole = 'ADMIN' | 'STAFF';

export interface RmsProfileView {
  fullName: string;
  email: string;
  role: RmsRole;
  avatarUrl: string | null;
}
