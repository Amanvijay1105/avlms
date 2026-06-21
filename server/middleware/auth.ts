import { Request, Response, NextFunction } from "express";
import CatchAsyncError from "./catchAsyncErrors.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis.js";
export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies?.access_token;
    if (!access_token) {
      return next(
        new ErrorHandler("Please login to access this resource", 400),
      );
    }
    const decoded = jwt.verify(
      access_token,
      process.env.ACCESS_SECRET as string,
    ) as JwtPayload;
    if (!decoded) {
      return next(new ErrorHandler("access token is not valid", 400));
    }
    const user = await redis.get(decoded.id);
    if (!user) {
      return next(new ErrorHandler("User not found ", 404));
    }
    req.user = JSON.parse(user);
    next();
  },
);

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `Role ${req.user?.role} is not allowed to access this resource `,
          401,
        ),
      );
    }
    next();
  };
};
