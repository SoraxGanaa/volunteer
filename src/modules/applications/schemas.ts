import { z } from "zod";

export const ApplySchema = z.object({
  message: z.string().max(1000).optional(),
});

export const DecideSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(1000).optional(),
});

export const ListApplicationsQuerySchema = z.object({
  status: z.string().optional(), // "PENDING" гэх мэт
});
