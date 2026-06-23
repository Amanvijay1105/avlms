import { Response } from "express";
import Course from "../models/course.model.js";
import CatchAsyncError from "../middleware/catchAsyncErrors.js";

export const createCourse = CatchAsyncError(
  async (data: any, res: Response) => {
    const course = await Course.create(data);
    res.status(201).json({
      success: true,
      course,
    });
  },
);
