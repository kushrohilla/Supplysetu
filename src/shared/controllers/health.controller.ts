import { Request, Response } from "express";

import { db } from "../../database/knex";

export const healthController = {
  async getStatus(_req: Request, res: Response) {
    await db.raw("select 1");

    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "SupplySetu",
      dependencies: {
        database: "up"
      }
    });
  }
};
