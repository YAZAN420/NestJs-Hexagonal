import { ActiveUserData } from 'src/iam/domain/interfaces/active-user-data.interface';
import { Role } from '../domain/enums/role.enum';

export const createMockUser = (overrides = {}): ActiveUserData => ({
  id: 'user-123',
  email: 'yazanmahfooz@gmail.com',
  role: Role.Admin,
  ...overrides,
});
