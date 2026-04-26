import { Router } from "express";
import {
    register,
    login,
    logout,
    getUserProfile,
} from "../controllers/user.controller.ts";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", getUserProfile);

export default router;
