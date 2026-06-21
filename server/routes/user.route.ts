import express from "express";
import {
  activateUser,
  loginUser,
  logoutUser,
  registerUser,
  updateAccessToken,
} from "../controllers/user.controller.js";
const router = express.Router();

router.post("/registration", registerUser);
router.post("/activate", activateUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/refresh-token",updateAccessToken)
export default router;
