export type AppErrorCode =
  | "EVENT_NOT_FOUND"
  | "EVENT_NOT_OPEN"
  | "EVENT_STARTED"
  | "CAPACITY_FULL"
  | "ALREADY_APPLIED"
  | "NO_PENDING_APPLICATION"
  | "FORBIDDEN"
  | "APPLICATION_NOT_FOUND"
  | "APPLICATION_NOT_PENDING";

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    public httpStatus: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(e: any): e is AppError {
  return e && e.name === "AppError" && typeof e.httpStatus === "number";
}
