import { UserRole } from 'src/schemas/user.schema';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string;
  addedByRole: string;
  addedById:string;
}
