import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const dbURL: string = process.env.MONGODB_URI || "";

export const connectDB = async () => {
  try {
    await mongoose.connect(dbURL).then((data: any) => {
      console.log(`database connected with ${data.connection.host}`);
    });
  } catch (error: any) {
    console.error(error.message);
    setTimeout(connectDB, 5000);
  }
};
