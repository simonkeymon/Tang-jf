import { z } from 'zod';

const genderEnum = z.enum(['male', 'female']);

const goalEnum = z.enum(['lose', 'maintain', 'gain']);

const activityLevelEnum = z.enum([
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
  'extra_active',
]);

const profileFieldsSchema = z.object({
  gender: genderEnum,
  age: z.number().int().min(1).max(150),
  height_cm: z.number().min(50).max(250),
  weight_kg: z.number().min(20).max(300),
  goal: goalEnum,
  activity_level: activityLevelEnum,
  dietary_restrictions: z.array(z.string()).optional().default([]),
  allergies: z.array(z.string()).optional().default([]),
});

export const putProfileSchema = profileFieldsSchema;

export const patchProfileSchema = profileFieldsSchema.partial();

export const updateAllergiesSchema = z.object({
  allergies: z.array(z.string().min(1)).min(1),
});

export const updateRestrictionsSchema = z.object({
  dietary_restrictions: z.array(z.string().min(1)).min(1),
});

export type ProfileInput = z.infer<typeof putProfileSchema>;
export type PatchProfileInput = z.infer<typeof patchProfileSchema>;
export type UpdateAllergiesInput = z.infer<typeof updateAllergiesSchema>;
export type UpdateRestrictionsInput = z.infer<typeof updateRestrictionsSchema>;

export function formatValidationErrors(error: z.ZodError): Array<{
  field: string;
  message: string;
}> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}
