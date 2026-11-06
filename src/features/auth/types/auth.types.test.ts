import {
  UserRoleSchema,
  signUpSchema,
  signInSchema,
  UserProfileSchema,
  updateProfileSchema,
  deleteAccountSchema,
} from "./auth.types";

const validSignUpInput = {
  username: "student",
  email: "student@example.com",
  password: "Senha@123",
  confirmPassword: "Senha@123",
};

const VALID_UUID = "98c70071-3cdb-4fcf-b167-c7ff54644d49";

describe("UserRoleSchema", () => {
  it("aceita os papéis 'student' e 'admin'", () => {
    expect(UserRoleSchema.safeParse("student").success).toBe(true);
    expect(UserRoleSchema.safeParse("admin").success).toBe(true);
  });

  it("rejeita papéis inválidos", () => {
    expect(UserRoleSchema.safeParse("manager").success).toBe(false);
    expect(UserRoleSchema.safeParse("").success).toBe(false);
  });
});

describe("signUpSchema", () => {
  describe("valid input", () => {
    it("accepts valid registration data", () => {
      const result = signUpSchema.safeParse(validSignUpInput);
      expect(result.success).toBe(true);
    });
  });

  describe("username and email", () => {
    it("rejects a username shorter than three characters", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        username: "ab",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a username longer than 100 characters", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        username: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects an invalid email", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects an email longer than 254 characters", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        email: `${"a".repeat(243)}@example.com`,
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown registration fields", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        role: "admin",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("password", () => {
    it("rejects a password without an uppercase letter", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        password: "senha@123",
        confirmPassword: "senha@123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a password shorter than eight characters", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        password: "Senh@1",
        confirmPassword: "Senh@1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a password longer than twenty characters", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        password: "senha@789101120324939232",
        confirmPassword: "senha@789101120324939232",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a password without a lowercase letter", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        password: "SENHA@123",
        confirmPassword: "SENHA@123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a password without a number", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        password: "Senha@abc",
        confirmPassword: "Senha@abc",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a password without a special character", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        password: "Senha123",
        confirmPassword: "Senha123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects mismatched password confirmation", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        confirmPassword: "Outra@123",
      });
      expect(result.success).toBe(false);
    });

    it("accepts a valid password with exactly eight characters", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        password: "Sena@123",
        confirmPassword: "Sena@123",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid password with exactly twenty characters", () => {
      const result = signUpSchema.safeParse({
        ...validSignUpInput,
        password: "SenhaMuito@123456789",
        confirmPassword: "SenhaMuito@123456789",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("signInSchema", () => {
  it("valida dados de login corretos", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "Password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const result = signInSchema.safeParse({
      email: "invalid-email",
      password: "Password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita senha acima do limite", () => {
    const result = signInSchema.safeParse({
      email: "user@example.com",
      password: `a${"b".repeat(20)}`,
    });
    expect(result.success).toBe(false);
  });
});

describe("UserProfileSchema", () => {
  const validProfile = {
    id: VALID_UUID,
    email: "user@example.com",
    username: "user123",
    role: "student",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("valida um perfil completo com sucesso", () => {
    const result = UserProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it("aplica 'student' como default quando role não é informado", () => {
    const { role: _role, ...profileWithoutRole } = validProfile;
    const result = UserProfileSchema.safeParse(profileWithoutRole);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("student");
    }
  });

  it("permite id e updatedAt ausentes (campos opcionais)", () => {
    const { id: _id, updatedAt: _updatedAt, ...minimalProfile } = validProfile;
    const result = UserProfileSchema.safeParse(minimalProfile);

    expect(result.success).toBe(true);
  });

  it("rejeita id que não seja um UUID válido", () => {
    const result = UserProfileSchema.safeParse({
      ...validProfile,
      id: "invalid-uuid-format",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita createdAt ausente ou inválido", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = validProfile;
    expect(UserProfileSchema.safeParse(withoutCreatedAt).success).toBe(false);
    expect(
      UserProfileSchema.safeParse({ ...validProfile, createdAt: "not-a-date" }).success
    ).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  const baseUpdate = {
    username: "newUsername",
    email: "newemail@example.com",
  };

  it("permite atualizar apenas username e email sem senha", () => {
    const result = updateProfileSchema.safeParse(baseUpdate);
    expect(result.success).toBe(true);
  });

  it("permite senha e confirmação vazias ('')", () => {
    const result = updateProfileSchema.safeParse({
      ...baseUpdate,
      password: "",
      confirmPassword: "",
    });
    expect(result.success).toBe(true);
  });

  it("valida quando uma nova senha atende todos os requisitos e confere", () => {
    const result = updateProfileSchema.safeParse({
      ...baseUpdate,
      password: "NewPassword@123",
      confirmPassword: "NewPassword@123",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita quando a nova senha não atende aos requisitos de complexidade", () => {
    const result = updateProfileSchema.safeParse({
      ...baseUpdate,
      password: "simplepassword",
      confirmPassword: "simplepassword",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita quando a nova senha e confirmPassword forem divergentes", () => {
    const result = updateProfileSchema.safeParse({
      ...baseUpdate,
      password: "NewPassword@123",
      confirmPassword: "DifferentPassword@123",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita campos desconhecidos e nomes vazios após trim", () => {
    expect(updateProfileSchema.safeParse({ ...baseUpdate, role: "admin" }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ ...baseUpdate, username: "   " }).success).toBe(false);
  });
});

describe("deleteAccountSchema", () => {
  it("aceita senha informada com pelo menos 1 caractere", () => {
    const result = deleteAccountSchema.safeParse({ password: "a" });
    expect(result.success).toBe(true);
  });

  it("rejeita quando a senha é enviada vazia", () => {
    const result = deleteAccountSchema.safeParse({ password: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita quando o campo password não é enviado", () => {
    const result = deleteAccountSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejeita senha acima do limite e propriedades extras", () => {
    expect(deleteAccountSchema.safeParse({ password: "x".repeat(21) }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: "senha", admin: true }).success).toBe(false);
  });
});