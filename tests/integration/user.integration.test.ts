/**
 * @jest-environment node
 */
import { createHash } from "node:crypto";
import bcrypt from 'bcryptjs';
import { prisma } from '@/core/database/prisma';
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  loginUser,
  registerUser,
} from '@/features/auth/services/auth';

jest.mock('@/core/security/jwt', () => ({
  signAccessToken: jest.fn().mockResolvedValue('integration-test-access-token'),
}));

jest.setTimeout(30000);

describe('Integração: cadastro de usuário', () => {
  const emails = [
    'integration_register@example.com',
    'integration_duplicate@example.com',
    'integration_login_valid@example.com',
    'integration_login_missing@example.com',
  ];

  beforeAll(async () => {
    await prisma.$connect();
  }, 30000);

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    } finally {
      await prisma.$disconnect();
    }
  }, 30000);

  it('deve criar o usuário com senha hash e persistir o refresh token como hash', async () => {
    const input = {
      username: 'integration_user',
      email: emails[0],
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
    };

    const result = await registerUser(input);

    expect(result.user).toBe(input.username);
    expect(result.accessToken.length).toBeGreaterThan(20);
    expect(result.refreshToken.length).toBeGreaterThan(20);

    const persistedUser = await prisma.user.findUnique({ where: { email: input.email } });
    expect(persistedUser).not.toBeNull();
    expect(persistedUser?.username).toBe(input.username);
    expect(persistedUser?.role).toBe('student');
    expect(persistedUser?.password).not.toBe(input.password);
    expect(await bcrypt.compare(input.password, persistedUser!.password)).toBe(true);

    const persistedRefreshToken = await prisma.refreshToken.findUnique({
      where: {
        tokenHash: createHash('sha256').update(result.refreshToken).digest('hex'),
      },
    });
    expect(persistedRefreshToken?.userId).toBe(persistedUser!.id);
    expect(persistedRefreshToken?.tokenHash).not.toBe(result.refreshToken);
  });

  it('deve rejeitar e-mail duplicado usando a constraint real do banco', async () => {
    const input = {
      username: 'duplicate_user',
      email: emails[1],
      password: 'Senha@123',
      confirmPassword: 'Senha@123',
    };

    await prisma.user.create({
      data: {
        email: input.email,
        username: 'already_exists',
        password: 'hashed_password',
        role: 'student',
      },
    });

    await expect(registerUser(input)).rejects.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it('deve rejeitar login quando o usuário não existe', async () => {
    await expect(
      loginUser({
        email: emails[3],
        password: 'Senha@123',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('deve rejeitar login quando a senha estiver incorreta', async () => {
    const hashedPassword = await bcrypt.hash('Senha@123', 10);

    await prisma.user.create({
      data: {
        email: emails[2],
        username: 'login_user',
        password: hashedPassword,
        role: 'student',
      },
    });

    await expect(
      loginUser({
        email: emails[2],
        password: 'SenhaErrada@123',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('deve autenticar o usuário e emitir um par de tokens', async () => {
    const password = 'Senha@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email: emails[2],
        username: 'login_user',
        password: hashedPassword,
        role: 'student',
      },
    });

    const result = await loginUser({
      email: emails[2],
      password,
    });

    expect(result.user).toBe('login_user');
    expect(result.accessToken.length).toBeGreaterThan(20);
    expect(result.refreshToken.length).toBeGreaterThan(20);
  });
});