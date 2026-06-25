import { Request, Response, NextFunction } from "express";
import CatchAsyncError from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service.js";
import Course from "../models/course.model.js";
import { redis } from "../utils/redis.js";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendEmail.js";
interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

interface IAnswerData {
  answer: string;
  questionId: string;
  courseId: string;
  contentId: string;
}

interface IAddReviewData {
  review: string;
  courseId: string;
  rating: string;
  userId: string;
}

interface IAddReviewReply {
  comment: string;
  courseId: string;
  reviewId: string;
}
export const uploadCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });
        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
        createCourse(data, res, next);
      }
    } catch (error: any) {
      next(new ErrorHandler(error.message, 500));
    }
  },
);

export const editCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const courseId = req.params.id;
      const thumbnail = data.thumbnail;
      if (thumbnail) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);
        const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
          folder: "courses",
        });

        data.thumbnail = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      }
      const course = await Course.findByIdAndUpdate(
        courseId,
        { $set: data },
        { new: true },
      );

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// get single course
export const getSingleCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const courseId = req.params.id;
    try {
      const isCachedCourseExists = await redis.get(courseId.toString());
      if (isCachedCourseExists) {
        const course = JSON.stringify(isCachedCourseExists);
        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return new ErrorHandler(error.message, 400);
    }
  },
);
// get all course without purchase
export const getAllCourses = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await Course.find().select(
        "-courseData.vedioUrl -courseData.suggestion -courseData.questions -courseData.links",
      );
      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

// get course content for valid user

export const getCourseByUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCoursesList = req.user?.courses;
      const courseId = req.params.id;
      const courseExists = userCoursesList?.find(
        (course: any) => course._id.toString() === courseId,
      );
      if (!courseExists) {
        return new ErrorHandler("You dont have access to this course", 401);
      }
      const course = await Course.findById(courseId);
      const content = course?.courseData;
      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return new ErrorHandler(error.message, 400);
    }
  },
);

export const addQuestion = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { question, courseId, contentId }: IAddQuestionData = req.body;
      const course = await Course.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid ObjectId", 400));
      }
      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId),
      );
      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const newQuestion: any = {
        user: req.user,
        question,
        questionReplies: [],
      };

      courseContent.questions.push(newQuestion);

      await course?.save();
      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
export const addAnswer = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const { answer, questionId, courseId, contentId }: IAnswerData = req.body;
      const course = await Course.findById(courseId);
      if (!mongoose.Types.ObjectId.isValid(contentId)) {
        return next(new ErrorHandler("Invalid content id", 400));
      }

      const courseContent = course?.courseData?.find((item: any) =>
        item._id.equals(contentId),
      );
      if (!courseContent) {
        return next(new ErrorHandler("Invalid content id", 400));
      }
      const question = await courseContent?.questions?.find((item: any) =>
        item._id.equals(questionId),
      );
      if (!question) {
        return next(new ErrorHandler("Invalid question id", 400));
      }

      const newAnswer: any = {
        user: req.user,
        answer,
      };
      question.questionReplies?.push(newAnswer);
      await course?.save();

      if (req.user._id === question.user._id) {
        // create a notification
      } else {
        const data = {
          name: question.user.name,
          title: courseContent.title,
        };
        await ejs.renderFile(
          path.join(process.cwd(), "mails", "activation-mail.ejs"),
          data,
        );

        await sendMail({
          email: user.email,
          subject: "Question Reply",
          template: "question-reply.ejs",
          data,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { review, rating } = req.body as IAddReviewData;
      const userCoursesList = req.user.courses;
      const courseId = req.params.id;

      const courseExists = userCoursesList.some(
        (course: any) => course._id.toString() === courseId.toString(),
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 400),
        );
      }
      const course = await Course.findById(courseId);
      const reviewData: any = {
        user: req.user,
        comment: review,
        rating,
      };
      course?.reviews.push(reviewData);
      let avg = 0;
      course?.reviews.forEach((rev: any) => {
        avg = rev.rating;
      });
      if (course) {
        course.ratings = avg / course.reviews.length;
      }
      await course?.save();

      const notification = {
        title: "New Review Received",
        message: `${req.user.name} has given a review in ${course?.name}`,
      };

      // send notification : TODO

      res.status(201).json({
        success: false,
        course,
      });
    } catch (error: any) {
      return new ErrorHandler(error.message, 400);
    }
  },
);

// Add reply to review

export const addReplyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewReply;
      const course = await Course.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found ", 404));
      }
      const review = course.reviews.find(
        (rev: any) => rev._id.toString() === reviewId.toString(),
      );
      if (!review) {
        return next(new ErrorHandler("review not found ", 404));
      }
      if (!review.commentReplies) {
        review.commentReplies = [];
      }
      const replyData: any = {
        user: req.user,
        comment,
      };

      review.commentReplies.push(replyData);
      await course.save();

      res.status(200).json({
        success: true,
        course,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);


