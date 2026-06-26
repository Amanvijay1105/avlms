import { NextFunction, Response } from "express";
import CatchAsyncError from "../middleware/catchAsyncErrors.js";
import Order from "../models/order.model.js";

export const newOrder = CatchAsyncError(
  async (data: any, res: Response, next: NextFunction) => {
    const order = await Order.create(data);
    res.status(201).json({
      success: true,
      order,
    });
  },
);
