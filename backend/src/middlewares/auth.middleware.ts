import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import User from "../models/user.model.ts";

const verifyUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token =
            req.cookies?.token || req.header("Authorization")?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized request",
            });
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as {
            _id: string;
        };

        const user = await User.findById(decodedToken._id).select("-password");

        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "Invalid Token" });
        }

        req.user = user;

        next();
    } catch (error) {
        return res
            .status(401)
            .json({ success: false, message: "Invalid Token" });
    }
};

export { verifyUser };
