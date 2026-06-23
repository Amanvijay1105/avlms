import express, { NextFunction,Request,Response } from "express"
import courseRoutes from "./routes/course.route.js"
import dotenv from "dotenv"
import cookieParser from "cookie-parser"
import userRoutes from "./routes/user.route.js"
import cors from "cors"
import { ErrorMiddleware } from "./middleware/error.js"
dotenv.config()
export const app = express()
app.use(express.json({limit:"50mb"}))
app.use(cors({
    origin : process.env.ORIGIN,
    credentials : true,
}))
app.use(cookieParser())
app.use("/api/user",userRoutes)
app.use("/api/course",courseRoutes)
app.all('/{*any}', (req, res, next) => {
    const err = new Error(`Route ${req.originalUrl} not found`);
    next(err);
});

app.use(ErrorMiddleware)