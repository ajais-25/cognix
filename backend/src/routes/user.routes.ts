import { Router } from "express";
import {
    register,
    login,
    logout,
    getUserProfile,
} from "../controllers/user.controller.ts";
import { verifyUser } from "../middlewares/auth.middleware.ts";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", verifyUser, logout);
router.get("/profile", verifyUser, getUserProfile);

export default router;
