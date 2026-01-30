import { z } from "zod";

export const MarkAttendanceSchema = z.object({
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
  checkInAt: z.string().optional(),
  note: z.string().max(1000).optional(),
});
