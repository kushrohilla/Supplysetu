import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import { toErrorResponse } from "../contracts/api-response";

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction) => {
  res.status(StatusCodes.NOT_FOUND).json(toErrorResponse("NOT_FOUND", "Route not found"));
};
