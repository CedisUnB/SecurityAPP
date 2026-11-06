import { z } from "zod";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const USERNAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;

export const UserRoleSchema = z.enum(["student", "admin"]);

export const signUpSchema = z.object({
  username: z.string().trim().min(3, "Nome de usuário muito curto").max(USERNAME_MAX_LENGTH),
  email: z.string().max(EMAIL_MAX_LENGTH, "E-mail muito longo").pipe(z.email("E-mail inválido")),
  password: z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`)
  .regex(passwordRegex, "A senha deve conter maiúscula, minúscula, número e caractere especial"),
  confirmPassword: z.string().max(PASSWORD_MAX_LENGTH),
}).strict()
.refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: z.string().max(EMAIL_MAX_LENGTH, "E-mail muito longo").pipe(z.email("E-mail inválido")),
  password: z.string().min(PASSWORD_MIN_LENGTH, "Senha inválida").max(PASSWORD_MAX_LENGTH, "Senha inválida"),
}).strict();

export const UserProfileSchema = z.object({
  id: z.uuid().optional(),
  email: z.string().max(EMAIL_MAX_LENGTH).pipe(z.email()),
  username: z.string().min(3).max(USERNAME_MAX_LENGTH),
  role: UserRoleSchema.default("student"),
  createdAt: z.date(),
  updatedAt: z.date().optional()
}).strict();

export const updateProfileSchema = z.object({
  username: z.string().trim().min(3, "Nome de usuário muito curto").max(USERNAME_MAX_LENGTH),
  email: z.string().max(EMAIL_MAX_LENGTH, "E-mail muito longo").pipe(z.email("E-mail inválido")),
  password: z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`)
  .regex(passwordRegex, "A senha deve conter maiúscula, minúscula, número e caractere especial")
  .optional()
  .or(z.literal("")),
  confirmPassword: z.string().max(PASSWORD_MAX_LENGTH).optional().or(z.literal("")),
}).strict().refine(
  (data) => {
    if (data.password && data.password.length > 0) {
      return data.password === data.confirmPassword;
    }
    return true;
  },
  {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  }
);

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "A senha é obrigatória para confirmar a exclusão").max(PASSWORD_MAX_LENGTH, "Senha inválida"),
}).strict();

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;