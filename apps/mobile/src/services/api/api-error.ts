export class ApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown> | null
  ) {
    super(message);
    this.name = "ApiError";
  }
}
