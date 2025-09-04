import { z } from 'zod';

const emailValidation = z.string()
  .min(1, 'Email is required')
  .email('Please enter a valid email');

const passwordValidation = z.string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const signInSchema = z.object({
  email: emailValidation,
  password: z.string().min(1, 'Password is required'), // No min length for sign in
});

export const signUpSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: emailValidation,
  password: passwordValidation,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export const resetPasswordSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  newPassword: passwordValidation,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;