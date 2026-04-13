import { z } from 'zod';

export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

export const registerSchema = z.object({
  email: z.string().trim().email('Email must be valid'),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email('Email must be valid'),
  password: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export function formatValidationErrors(error: z.ZodError): Array<{
  field: string;
  message: string;
}> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}
