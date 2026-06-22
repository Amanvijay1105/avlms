import express from "express";
import {
  activateUser,
  getUserInfo,
  loginUser,
  logoutUser,
  registerUser,
  socialAuth,
  updateAccessToken,
  updateUserInfo,
  updateUserPassword,
} from "../controllers/user.controller.js";
import { isAuthenticated } from "../middleware/auth.js";
const router = express.Router();

router.post("/registration", registerUser);
router.post("/activate", activateUser);
router.post("/login", loginUser);
router.get("/logout", logoutUser);
router.get("/refresh-token",updateAccessToken)
router.get("/me",isAuthenticated,getUserInfo)
router.post("/socialAuth",socialAuth)
router.post("/update-user-info",isAuthenticated,updateUserInfo)
router.post("/update-user-password",isAuthenticated,updateUserPassword)

export default router;
