import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

const app = express();

app.use(
    cors({
        origin: process.env.CORS,
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

import conversationRoutes from "./routes/conversation.routes.ts";

app.use("/api/v1/conversations", conversationRoutes);

export default app;
