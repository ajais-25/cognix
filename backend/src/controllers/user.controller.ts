import jwt from "jsonwebtoken";
import User from "../models/user.model.ts";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import bcrypt from "bcrypt";

const generateAuthToken = (_id: Types.ObjectId): string => {
    const secret = process.env.JWT_SECRET!;

    if (!secret) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }

    return jwt.sign({ _id: _id.toString() }, secret, {
        expiresIn: "7d",
    });
};

const register = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res
                .status(400)
                .json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        return res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            message: "User registered successfully",
        });
    } catch (error: any) {
        console.log(error.message);

        return res.status(500).json({ success: false, message: error.message });
    }
};

const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res
            .status(400)
            .json({ success: false, message: "All fields are required" });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid credentials" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid credentials" });
        }

        const token = generateAuthToken(user._id);

        const loggedInUser = await User.findById(user._id).select("-password");

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        };

        return res.status(200).cookie("token", token, options).json({
            success: true,
            data: loggedInUser,
            message: "User logged in successfully",
        });
    } catch (error) {
        console.error("Error logging in user:", error);

        return res.status(500).json({
            success: false,
            message: "Error logging in user",
        });
    }
};

const logout = async (req: Request, res: Response) => {
    try {
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
        };

        res.clearCookie("token", options);

        return res.status(200).json({
            success: true,
            message: "User logged out successfully",
        });
    } catch (error) {
        console.error("Error logging out user:", error);

        return res.status(500).json({
            success: false,
            message: "Error logging out user",
        });
    }
};

const getUserProfile = async (req: Request, res: Response) => {
    try {
        if (!req.user?._id) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized request" });
        }

        const user = await User.findById(req.user?._id).select("-password");

        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);

        return res.status(500).json({
            success: false,
            message: "Error fetching user profile",
        });
    }
};

export { register, login, logout, getUserProfile };
