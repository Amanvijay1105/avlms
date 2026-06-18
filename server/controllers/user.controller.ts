import { Request, Response, NextFunction } from "express";
import User from "../models/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import CatchAsyncError from "../middleware/catchAsyncErrors.js";
import sendMail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import ejs from "ejs";
import path from "path";

interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

interface IActivationToken {
  token: string;
  activationCode: string;
}

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

export const createActivationToken = (
  user: IRegistrationBody,
): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET as string,
    {
      expiresIn: "5m",
    },
  );

  return {
    token,
    activationCode,
  };
};

export const registerUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, avatar }: IRegistrationBody = req.body;

      const isEmailExists = await User.findOne({
        email,
      });

      if (isEmailExists) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user: IRegistrationBody = {
        name,
        email,
        password,
        avatar,
      };

      const activationToken = createActivationToken(user);

      const activationCode = activationToken.activationCode;

      const data = {
        user: {
          name: user.name,
        },
        activationCode,
      };

      await ejs.renderFile(
        path.join(process.cwd(), "mails", "activation-mail.ejs"),
        data,
      );

      await sendMail({
        email: user.email,
        subject: "Activate Your AB LMS Account",
        template: "activation-mail.ejs",
        data,
      });

      return res.status(201).json({
        success: true,
        message: `Please check your email: ${user.email} to activate your account`,
        activationToken: activationToken.token,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } =
        req.body as IActivationRequest;

      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET as string,
      ) as {
        user: IRegistrationBody;
        activationCode: string;
      };

      if (newUser.activationCode !== activation_code) {
        return next(new ErrorHandler("Invalid activation code", 400));
      }

      const { name, email, password } = newUser.user;

      const existingUser = await User.findOne({
        email,
      });

      if (existingUser) {
        return next(new ErrorHandler("Email already exists", 400));
      }

      const user = await User.create({
        name,
        email,
        password,
        isVerified: true,
      });

      return res.status(201).json({
        success: true,
        message: "Account activated successfully",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
