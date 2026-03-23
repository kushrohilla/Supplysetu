import { AppError } from "../../../shared/errors/app-error";

export const toOrderTransitionErrorResponse = (error: AppError) => {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? null
    }
  };
};
