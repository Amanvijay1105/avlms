import express from "express"
import { activateUser, registerUser } from "../controllers/user.controller.js"
const router = express.Router()

router.post("/registration",registerUser)
router.post("/activate",activateUser)
export default router