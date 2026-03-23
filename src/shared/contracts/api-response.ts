export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error_code: string;
  message: string;
  details?: Record<string, unknown> | null;
};

export const toSuccessResponse = <T>(data: T): ApiSuccessResponse<T> => ({
  success: true,
  data
});

export const toErrorResponse = (
  errorCode: string,
  message: string,
  details?: Record<string, unknown> | null
): ApiErrorResponse => ({
  success: false,
  error_code: errorCode,
  message,
  details: details ?? null
});
