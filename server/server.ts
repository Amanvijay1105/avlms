import { app } from "./app.js";

import dotenv from "dotenv";
import { connectDB } from "./utils/db.js";
dotenv.config();
app.listen(process.env.PORT, () => {
  connectDB();
  console.log(`Server is connected with port ${process.env.PORT}`);
});


