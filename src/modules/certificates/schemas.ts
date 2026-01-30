import { z } from "zod";

export const CreateCertSchema = z.object({
  title: z.string().min(2),
  issuer: z.string().max(200).optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  fileUrl: z.string().min(5),
  note: z.string().max(1000).optional(),
});

export const UpdateCertSchema = z.object({
  title: z.string().min(2).optional(),
  issuer: z.string().max(200).nullable().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  fileUrl: z.string().min(5).nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
});
