import { Request, Response, NextFunction } from "express";
import User from "../models/user.model.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import CatchAsyncError from "../middleware/catchAsyncErrors.js";
import sendMail from "../utils/sendEmail.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import {
  accessTokenOptions,
  refreshTokenOptions,
  sendToken,
} from "../utils/jwt.js";
import { redis } from "../utils/redis.js";
import { getUserById } from "../services/user.service.js";
import cloudinary from "cloudinary";
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
interface ILoginReguest {
  email: string;
  password: string;
}
interface ISocialAuthBody {
  name: string;
  email: string;
  avatar?: {
    public_id: string;
    url: string;
  };
}

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

interface IUPdateProfilePicture {
  avatar: string;
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

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password }: ILoginReguest = req.body;
      if (!email || !password) {
        return next(new ErrorHandler("Please Enter email and password", 400));
      }
      const isEmailExists = await User.findOne({ email }).select("+password");
      if (!isEmailExists) {
        return next(new ErrorHandler("Email not found", 404));
      }
      const isPasswordMatch = isEmailExists.comparePassword(password);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Invalid credentials", 400));
      }

      sendToken(isEmailExists, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

export const logoutUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });

      const userId = req.user?._id.toString() || "";

      await redis.del(userId);

      res.status(200).json({
        success: true,
        message: "User logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies?.refresh_token as string;
      const decoded = jwt.verify(
        refresh_token,
        process.env.REFRESH_SECRET as string,
      ) as JwtPayload;
      if (!decoded) {
        return next(new ErrorHandler("Could not refresh token", 400));
      }
      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(new ErrorHandler("Could not refresh token", 400));
      }
      const user = JSON.parse(session);

      const accessToken = jwt.sign(
        { id: user._id },
        process.env.ACCESS_SECRET as string,
        { expiresIn: "5m" },
      );

      const refreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_SECRET as string,
        { expiresIn: "5m" },
      );

      req.user = user;

      res.cookie("access_token", accessToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);

      res.status(200).json({
        status: "success",
        accessToken,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  },
);

export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      getUserById(userId.toString(), res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

export const socialAuth = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;

      if (!email || !name) {
        return next(new ErrorHandler("Email and name are required", 400));
      }

      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          email,
          name,
          isVerified: true,
          avatar: avatar || {
            public_id: "",
            url: "",
          },
        });
      }

      sendToken(user, 200, res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

export const updateUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;
      const userId = req.user._id;
      const user = await User.findById(userId);
      if (email && user) {
        const isEmailExists = await User.findOne({ email });
        if (isEmailExists) {
          return next(new ErrorHandler("Enail Already exists", 400));
        }
        user.email = email;
      }
      if (name && user) {
        user.name = name;
      }
      await user?.save();

      await redis.set(userId.toString(), JSON.stringify(user));
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);

export const updateUserPassword = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;
      if (!oldPassword || !newPassword) {
        return next(new ErrorHandler("please enter new and old password", 400));
      }
      const user = await User.findById(req.user._id);
      if (user?.password === undefined) {
        return next(new ErrorHandler("incalid User", 400));
      }
      const isPasswordMatch = user?.comparePassword(oldPassword);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("wrong old password", 401));
      }
      user.password = newPassword;
      await user.save();
      await redis.set(user._id.toString(), JSON.stringify(user));
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  },
);

export const updateProfilePicture = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUPdateProfilePicture;

      const userId = req.user._id;
      const user = await User.findById(userId);

      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (!avatar) {
        return next(new ErrorHandler("Avatar is required", 400));
      }
      if (user.avatar?.public_id) {
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }
      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
        width: 150,
      });

      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };

      await user.save();

      await redis.set(userId.toString(), JSON.stringify(user));

      res.status(200).json({
        success: true,
        message: "Profile picture updated successfully",
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  },
);
