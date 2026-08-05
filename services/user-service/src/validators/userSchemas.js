const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.name || data.email, {
    message: 'At least one of name or email is required',
  });

module.exports = { registerSchema, loginSchema, updateProfileSchema };
