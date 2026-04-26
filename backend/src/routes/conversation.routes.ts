import { Router } from "express";
import {
    ask,
    askFollowUp,
    getAllConversations,
    getConversation,
} from "../controllers/conversation.controller.ts";

const router = Router();

router.post("/", ask);
router.get("/", getAllConversations);
router.get("/:conversationId", getConversation);
router.post("/:conversationId/follow-up", askFollowUp);

export default router;
