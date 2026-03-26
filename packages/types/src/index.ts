export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error_code: string;
  message: string;
  details: Record<string, unknown> | null;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
