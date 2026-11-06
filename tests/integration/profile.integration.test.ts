/**
 * @jest-environment node
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/core/database/prisma';
import {
  EmailAlreadyExistsError,
  ForbiddenError,
  InvalidCredentialsError,
  deleteUserAccount,
  getAdminProfile,
  getUserProfile,
  loginUser,
  updateUserProfile,
} from '@/features/auth/services/auth';

jest.mock('@/core/security', () => ({
  signToken: jest.fn().mockResolvedValue('integration-test-token'),
}));

jest.setTimeout(30000);

describe('Integração: visualizar, atualizar e excluir perfil', () => {
  const emails = [
    'integration_profile_view@example.com',
    'integration_profile_update@example.com',
    'integration_profile_taken@example.com',
    'integration_profile_password@example.com',
    'integration_profile_delete_ok@example.com',
    'integration_profile_delete_wrong@example.com',
    'integration_profile_admin@example.com',
    'integration_profile_student@example.com',
    'integration_profile_missing@example.com',
  ];

  const password = 'Senha@123';

  async function createUser(overrides: {
    email: string;
    username: string;
    role?: 'student' | 'admin';
    plainPassword?: string;
  }) {
    const hashedPassword = await bcrypt.hash(overrides.plainPassword ?? password, 10);

    return prisma.user.create({
      data: {
        email: overrides.email,
        username: overrides.username,
        password: hashedPassword,
        role: overrides.role ?? 'student',
      },
    });
  }

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

  describe('getUserProfile', () => {
    it('deve retornar o perfil completo de um usuário existente', async () => {
      const user = await createUser({
        email: emails[0],
        username: 'profile_view_user',
      });

      const profile = await getUserProfile(user.id);

      expect(profile.username).toBe('profile_view_user');
      expect(profile.email).toBe(emails[0]);
      expect(profile.role).toBe('student');
      expect(profile.createdAt).toBeInstanceOf(Date);
    });

    it('deve lançar erro quando o id não corresponde a nenhum usuário', async () => {
      await expect(getUserProfile('id-inexistente')).rejects.toThrow(
        'Usuário não encontrado.',
      );
    });
  });

  describe('updateUserProfile', () => {
    it('deve atualizar username e e-mail e persistir a mudança no banco', async () => {
      const user = await createUser({
        email: emails[1],
        username: 'before_update',
      });

      const updated = await updateUserProfile(user.id, {
        username: 'after_update',
        email: emails[1],
        password: '',
        confirmPassword: '',
      });

      expect(updated.username).toBe('after_update');

      const persisted = await prisma.user.findUnique({ where: { id: user.id } });
      expect(persisted?.username).toBe('after_update');
    });

    it('deve permitir manter o próprio e-mail sem disparar erro de duplicidade', async () => {
      const user = await createUser({
        email: emails[1],
        username: 'same_email_user',
      });

      await expect(
        updateUserProfile(user.id, {
          username: 'same_email_user_renamed',
          email: emails[1],
          password: '',
          confirmPassword: '',
        }),
      ).resolves.toMatchObject({ email: emails[1] });
    });

    it('deve rejeitar e-mail já utilizado por outro usuário', async () => {
      await createUser({ email: emails[2], username: 'owner_of_email' });
      const otherUser = await createUser({
        email: emails[1],
        username: 'wants_taken_email',
      });

      await expect(
        updateUserProfile(otherUser.id, {
          username: otherUser.username,
          email: emails[2],
          password: '',
          confirmPassword: '',
        }),
      ).rejects.toBeInstanceOf(EmailAlreadyExistsError);
    });

    it('deve rehashear a senha quando uma nova senha é enviada', async () => {
      const user = await createUser({
        email: emails[3],
        username: 'password_update_user',
        plainPassword: password,
      });

      await updateUserProfile(user.id, {
        username: user.username,
        email: emails[3],
        password: 'NovaSenha@456',
        confirmPassword: 'NovaSenha@456',
      });

      const persisted = await prisma.user.findUnique({ where: { id: user.id } });
      expect(persisted?.password).not.toBe(user.password);
      expect(await bcrypt.compare('NovaSenha@456', persisted!.password)).toBe(true);
      expect(await bcrypt.compare(password, persisted!.password)).toBe(false);
    });

    it('deve manter a senha original quando nenhuma nova senha é enviada', async () => {
      const user = await createUser({
        email: emails[3],
        username: 'password_keep_user',
        plainPassword: password,
      });

      await updateUserProfile(user.id, {
        username: 'password_keep_user_renamed',
        email: emails[3],
        password: '',
        confirmPassword: '',
      });

      const persisted = await prisma.user.findUnique({ where: { id: user.id } });
      expect(persisted?.password).toBe(user.password);
      expect(await bcrypt.compare(password, persisted!.password)).toBe(true);
    });
  });

  describe('deleteUserAccount', () => {
    it('deve anonimizar e-mail/username e zerar a senha, mantendo o registro no banco', async () => {
      const user = await createUser({
        email: emails[4],
        username: 'to_be_deleted',
        plainPassword: password,
      });

      await deleteUserAccount(user.id, { password });

      const persisted = await prisma.user.findUnique({ where: { id: user.id } });
      expect(persisted).not.toBeNull();
      expect(persisted?.email).toBe(`deleted_${user.id}@anonymized.local`);
      expect(persisted?.username).toBe(`usuario_deletado_${user.id.slice(0, 8)}`);
      expect(persisted?.password).toBe('');
    });

    it('deve rejeitar senha incorreta e não alterar o registro', async () => {
      const user = await createUser({
        email: emails[5],
        username: 'delete_wrong_password',
        plainPassword: password,
      });

      await expect(
        deleteUserAccount(user.id, { password: 'SenhaErrada@999' }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);

      const persisted = await prisma.user.findUnique({ where: { id: user.id } });
      expect(persisted?.email).toBe(emails[5]);
      expect(persisted?.username).toBe('delete_wrong_password');
    });

    it('deve impedir login com as credenciais antigas após a exclusão', async () => {
      const user = await createUser({
        email: emails[4],
        username: 'login_after_delete',
        plainPassword: password,
      });

      await deleteUserAccount(user.id, { password });

      await expect(
        loginUser({ email: emails[4], password }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });
  });

  describe('getAdminProfile', () => {
    it('deve retornar o perfil quando o usuário possui role admin', async () => {
      const admin = await createUser({
        email: emails[6],
        username: 'admin_user',
        role: 'admin',
      });

      const profile = await getAdminProfile(admin.id);

      expect(profile.role).toBe('admin');
      expect(profile.username).toBe('admin_user');
    });

    it('deve lançar ForbiddenError quando o usuário não é admin', async () => {
      const student = await createUser({
        email: emails[7],
        username: 'student_user',
        role: 'student',
      });

      await expect(getAdminProfile(student.id)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
