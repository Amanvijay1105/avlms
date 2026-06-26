import { Request, Response, NextFunction } from "express";
import CatchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import Order, { IOrder } from "../models/order.model.js";
import User from "../models/user.model.js";
import path from "node:path";
import ejs from "ejs";
import sendMail from "../utils/sendEmail.js";
import Notification from "../models/notification.model.js";
import Course from "../models/course.model.js";
import { newOrder } from "../services/order.service.js";

export const createOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;
      const user = await User.findById(req.user._id);
      const userHasCourse = user?.courses.some(
        (item: any) => item._id.toString() === courseId.toString(),
      );
      if (!userHasCourse) {
        return next(
          new ErrorHandler("you have already purchased this course ", 400),
        );
      }
      const course = await Course.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const data: any = {
        courseId: course._id,
        userId: user?._id,
        payment_info,
      };

      const mailData: any = {
        order: {
          _id: course._id.toString().slice(0, 6),
          name: course.name,
          price: course.price,
          date: new Date().toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      };

      const html = await ejs.renderFile(
        path.join(process.cwd(), "mails", "order-confirmation.ejs"),
        { order: mailData },
      );
      try {
        if (user) {
          await sendMail({
            email: user.email,
            subject: "Order confirmation",
            template: "order-confirmation.ejs",
            data: mailData,
          });
        }
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
      user?.courses.push({ courseId: course?._id.toString() });

      await Notification.create({
        userId: user?._id.toString(),
        title: "New Order",
        message: `you have a new order from ${course.name}`,
      });
      course.purchased ? course.purchased + 1 : course.purchased;
      await course.save();

      newOrder(data, res, next);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
