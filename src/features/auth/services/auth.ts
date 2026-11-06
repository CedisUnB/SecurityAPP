import bcrypt from "bcryptjs";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { createTokenSession } from "@/core/security";
import { authRepository } from "../repositories/auth.repository";
import { SignUpInput, SignInInput, UserProfileSchema, UserProfile, UpdateProfileInput, DeleteAccountInput } from "../types/auth.types";
import { beginLoginAttempt, clearLoginAttempts } from "./login-rate-limit";

const DUMMY_HASH = bcrypt.hashSync("senha-inexistente", 10);

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("Este e-mail já foi cadastrado.");
    this.name = "EmailAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha inválidos.");
    this.name = "InvalidCredentialsError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("Usuário não encontrado.");
    this.name = "UserNotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Acesso restrito a administradores.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function loginUser(input: SignInInput) {
  const emailHash = await beginLoginAttempt(input.email);

  const user = await authRepository.findByEmail(input.email);
  const isValidPassword = await bcrypt.compare(input.password, user?.password ?? DUMMY_HASH);

  if (!user || !isValidPassword) {
    throw new InvalidCredentialsError();
  }

  await clearLoginAttempts(emailHash);

  const tokens = await createTokenSession(user);

  return { user: user.username, ...tokens };
}

export async function registerUser(input: SignUpInput) {

  const existing = await authRepository.findByEmail(input.email);
  if (existing) throw new EmailAlreadyExistsError();

  const hashedPassword = await bcrypt.hash(input.password, 10);

  let user;
  try {
    user = await authRepository.createUser({
      email: input.email,
      username: input.username,
      password: hashedPassword,
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new EmailAlreadyExistsError();
    }

    throw error;
  }

  const tokens = await createTokenSession(user);

  return { user: user.username, ...tokens };
}

export async function getUserProfile(id: string): Promise <UserProfile> {
  if(!id) {
    throw new Error("Identificador do usuário é obrigatório.")
  }

  const user = await authRepository.findById(id);

  if (!user) {
    throw new UserNotFoundError();
  }

  return UserProfileSchema.parse(user);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<UserProfile> {
  const currentUser = await authRepository.findById(userId);
  if (!currentUser) {
    throw new UserNotFoundError();
  }

  if (input.email !== currentUser.email) {
    const emailInUse = await authRepository.findByEmail(input.email);
    if (emailInUse && emailInUse.id !== userId) {
      throw new EmailAlreadyExistsError();
    }
  }

  const updatePayload: { username: string; email: string; password?: string } = {
    username: input.username,
    email: input.email,
  };

  if (input.password && input.password.trim() !== "") {
    updatePayload.password = await bcrypt.hash(input.password, 10);
  }

  try {
    return await authRepository.updateUser(userId, updatePayload);
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new EmailAlreadyExistsError();
    }
    throw error;
  }
}

export async function deleteUserAccount(userId: string, input: DeleteAccountInput) {
  const user = await authRepository.findPasswordHashById(userId);
  if (!user) {
    throw new UserNotFoundError();
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.password);
  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  await authRepository.softDeleteAndAnonymize(userId);
}


export async function getAdminProfile(userId: string): Promise<UserProfile> {
  if (!userId) {
    throw new Error("Identificador do usuário é obrigatório.");
  }

  const user = await authRepository.findById(userId);

  if (!user) {
    throw new UserNotFoundError();
  }

  if (user.role !== "admin") {
    throw new ForbiddenError();
  }

  return UserProfileSchema.parse(user);
}