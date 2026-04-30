import { Router } from "express";
import multer from "multer";
import {
    ask,
    askFollowUp,
    getAllConversations,
    getConversation,
    uploadPdfAndAsk,
} from "../controllers/conversation.controller.ts";
import { verifyUser } from "../middlewares/auth.middleware.ts";

const router = Router();
const upload = multer({ dest: "uploads/" });

router.use(verifyUser);

router.post("/pdf", upload.single("file"), uploadPdfAndAsk);
router.post("/", ask);
router.get("/", getAllConversations);
router.get("/:conversationId", getConversation);
router.post("/:conversationId/follow-up", askFollowUp);

export default router;
