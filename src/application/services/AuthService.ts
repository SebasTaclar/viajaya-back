import { generateToken } from '../../shared/jwtHelper';
import { Logger } from '../../shared/Logger';
import { PasswordUtils } from '../../shared/PasswordUtils';
import { ValidationError, AuthenticationError, ConflictError, AuthorizationError } from '../../shared/exceptions';
import { IUserDataSource, UserWithClients } from '../../domain/interfaces/IUserDataSource';
import { IClientDataSource } from '../../domain/interfaces/IClientDataSource';
import { canChangePassword, canDeleteUser, canCreateUserWithRole } from '../../shared/roleMiddleware';
import { USER_ROLES } from '../../shared/UserRoles';
import { AuthenticatedUser } from '../../shared/authMiddleware';

export interface LoginRequest {
  email?: string;
  cedula?: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string | null;
  role: string;
  name: string;
  membershipPaid: boolean;
}

export interface CreateUserRequest {
  clientId?: number;
  password: string;
  role?: string;
  email?: string;
  name?: string;
}

export class AuthService {
  private logger: Logger;
  private userDataSource: IUserDataSource;
  private clientDataSource: IClientDataSource;

  constructor(logger: Logger, userDataSource: IUserDataSource, clientDataSource: IClientDataSource) {
    this.logger = logger;
    this.userDataSource = userDataSource;
    this.clientDataSource = clientDataSource;
  }

  async login(loginRequest: LoginRequest): Promise<string> {
    const { email, cedula, password } = loginRequest;

    if (cedula) {
      return this.loginWithCedula(cedula, password);
    }

    this.logger.logInfo(`Login attempt for user: ${email}`);

    if (!email || !password) {
      this.logger.logWarning('Login failed: missing email or password');
      throw new ValidationError('Email and password are required');
    }

    // Get user by email from data source
    const user = await this.userDataSource.getByEmail(email);

    if (!user) {
      this.logger.logWarning(`Login failed for user: ${email} - user not found`);
      throw new AuthenticationError('Invalid credentials');
    }

    // Validate password using centralized utility
    const isValidPassword = await PasswordUtils.comparePassword(password, user.password);

    if (!isValidPassword) {
      this.logger.logWarning(`Login failed for user: ${email} - invalid password`);
      throw new AuthenticationError('Invalid credentials');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      membershipPaid: user.membershipPaid,
    });

    this.logger.logInfo(`Login successful for user: ${email} with role: ${user.role}`);

    return token;
  }

  async loginWithCedula(cedula: string, password: string): Promise<string> {
    this.logger.logInfo(`Portal login attempt for cedula: ${cedula}`);

    if (!password) {
      throw new ValidationError('Password is required');
    }

    const client = await this.clientDataSource.getByCedula(cedula);

    if (!client || !client.userId) {
      this.logger.logWarning(`Portal login failed for cedula: ${cedula} - not found`);
      throw new AuthenticationError('Invalid credentials');
    }

    const user = await this.userDataSource.getById(client.userId.toString());

    if (!user) {
      this.logger.logWarning(`Portal login failed for cedula: ${cedula} - user not found`);
      throw new AuthenticationError('Invalid credentials');
    }

    const isValidPassword = await PasswordUtils.comparePassword(password, user.password);

    if (!isValidPassword) {
      this.logger.logWarning(`Portal login failed for cedula: ${cedula} - invalid password`);
      throw new AuthenticationError('Invalid credentials');
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      membershipPaid: user.membershipPaid,
    });

    this.logger.logInfo(`Portal login successful for cedula: ${cedula}`);

    return token;
  }

  async createUser(createUserRequest: CreateUserRequest, requester: AuthenticatedUser): Promise<UserInfo> {
    const { clientId, password, role, email, name } = createUserRequest;

    const targetRole = role || USER_ROLES.USER;

    this.logger.logInfo(`Creating user with role: ${targetRole} by ${requester.email} (${requester.role})`);

    if (!canCreateUserWithRole(requester, targetRole)) {
      this.logger.logWarning(
        `Authorization denied: ${requester.email} (${requester.role}) cannot create user with role ${targetRole}`
      );
      throw new AuthorizationError('You do not have permission to create a user with this role');
    }

    if (!password) {
      throw new ValidationError('Password is required');
    }

    PasswordUtils.validatePassword(password);

    let userEmail: string | null;
    let userName: string;

    if (targetRole === USER_ROLES.USER) {
      if (!clientId) {
        throw new ValidationError('clientId is required for role "user"');
      }

      const targetClient = await this.clientDataSource.getById(clientId);
      if (!targetClient) {
        throw new ValidationError('Client not found');
      }

      if (targetClient.userId) {
        throw new ConflictError('Client already has a user assigned');
      }

      userEmail = targetClient.email;
      userName = targetClient.name;
    } else {
      if (!email || !name) {
        throw new ValidationError('email and name are required for admin/superadmin/team users');
      }

      userEmail = email;
      userName = name;
    }

    if (userEmail) {
      const existingUser = await this.userDataSource.getByEmail(userEmail);
      if (existingUser) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    const hashedPassword = await PasswordUtils.hashPassword(password);

    const newUser = {
      id: 0,
      email: userEmail,
      password: hashedPassword,
      name: userName,
      role: targetRole,
      membershipPaid: false,
    };

    try {
      const createdUser = await this.userDataSource.create(newUser);

      if (targetRole === USER_ROLES.USER && clientId) {
        await this.clientDataSource.update(clientId, { userId: createdUser.id });
        this.logger.logInfo(`Client ${clientId} linked to user ${createdUser.id}`);
      }

      this.logger.logInfo(`User created successfully: ${userEmail}`);

      return {
        id: createdUser.id.toString(),
        email: createdUser.email,
        name: createdUser.name,
        role: createdUser.role,
        membershipPaid: createdUser.membershipPaid,
      };
    } catch (error) {
      this.logger.logError(`Error creating user ${userEmail}`, error);
      throw error;
    }
  }

  async getAllUsers(requester: AuthenticatedUser): Promise<UserWithClients[]> {
    this.logger.logInfo(`Fetching all users with clients (requested by ${requester.email} - ${requester.role})`);
    const users = await this.userDataSource.getAllWithClients();

    if (requester.role === USER_ROLES.ADMIN) {
      return users.filter((u) => u.role !== USER_ROLES.SUPERADMIN);
    }

    return users;
  }

  async changePassword(targetUserId: string, newPassword: string, requester: AuthenticatedUser): Promise<void> {
    this.logger.logInfo(`Password change requested for user: ${targetUserId} by ${requester.email} (${requester.role})`);

    if (!newPassword) {
      throw new ValidationError('New password is required');
    }

    PasswordUtils.validatePassword(newPassword);

    const targetUser = await this.userDataSource.getById(targetUserId);
    if (!targetUser) {
      throw new ValidationError('User not found');
    }

    const isSelf = requester.id.toString() === targetUserId;

    if (!canChangePassword(requester, targetUser.role, isSelf)) {
      this.logger.logWarning(
        `Authorization denied: ${requester.email} (${requester.role}) cannot change password for user ${targetUserId} (${targetUser.role})`
      );
      throw new AuthorizationError('You do not have permission to change this user\'s password');
    }

    const isSamePassword = await PasswordUtils.comparePassword(newPassword, targetUser.password);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password');
    }

    const hashedPassword = await PasswordUtils.hashPassword(newPassword);
    await this.userDataSource.update(targetUserId, { password: hashedPassword });

    this.logger.logInfo(`Password changed successfully for user: ${targetUserId}`);
  }

  async deleteUser(id: string, requester: AuthenticatedUser): Promise<void> {
    this.logger.logInfo(`Delete requested for user: ${id} by ${requester.email} (${requester.role})`);

    const user = await this.userDataSource.getById(id);
    if (!user) {
      throw new ValidationError('User not found');
    }

    const isSelf = requester.id.toString() === id;

    if (!canDeleteUser(requester, user.role, isSelf)) {
      this.logger.logWarning(
        `Authorization denied: ${requester.email} (${requester.role}) cannot delete user ${id} (${user.role})`
      );
      throw new AuthorizationError('You do not have permission to delete this user');
    }

    // Unlink associated clients before deleting
    const clients = await this.clientDataSource.getByUserId(parseInt(id));
    if (clients.length > 0) {
      this.logger.logInfo(`Unlinking ${clients.length} clients from user ${id}`);
      for (const client of clients) {
        await this.clientDataSource.update(client.id, { userId: null });
      }
    }

    const deleted = await this.userDataSource.delete(id);
    if (!deleted) {
      throw new ValidationError('Failed to delete user');
    }

    this.logger.logInfo(`User deleted successfully: ${id}`);
  }
}
