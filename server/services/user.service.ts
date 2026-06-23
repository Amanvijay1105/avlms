import { Response } from "express";
import User from "../models/user.model.js";
import { redis } from "../utils/redis.js";

export const getUserById = async (id: string, res: Response) => {
  let user = await redis.get(id)
  if(user){
    user = JSON.parse(user)
  }
  res.status(200).json({
    success: true,
    user,
  });
};


