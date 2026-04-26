import { streamText } from "ai";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "../prompt";
import Conversation from "../models/conversation.model";
import Message from "../models/messsage.model";
import { client as tavily } from "../utils/tavily";

const getConversationTitle = (query: string) => {
    const trimmed = query.trim();
    return trimmed.length <= 80 ? trimmed : `${trimmed.slice(0, 77)}...`;
};

const buildHistoryPrompt = (
    history: Array<{ role: "user" | "assistant"; content: string }>,
    userQuery: string
) => {
    const historyBlock = history
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n\n");

    return `
## CONVERSATION_HISTORY
${historyBlock || "No previous conversation history."}

## USER_QUERY
${userQuery}
`;
};

const ask = async (req: Request, res: Response) => {
    try {
        const { query } = req.body as { query?: string };

        if (!req.user?._id) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized request" });
        }

        if (!query || typeof query !== "string" || !query.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "Query is required" });
        }

        const normalizedQuery = query.trim();

        const webSearchResponse = await tavily.search(normalizedQuery, {
            searchDepth: "advanced",
        });

        const webSearchResults = webSearchResponse.results ?? [];

        const prompt = PROMPT_TEMPLATE.replace(
            "{{WEB_SEARCH_RESULTS}}",
            JSON.stringify(webSearchResults)
        ).replace("{{USER_QUERY}}", normalizedQuery);

        const conversation = await Conversation.create({
            title: getConversationTitle(normalizedQuery),
            userId: req.user._id,
        });

        await Message.create({
            content: normalizedQuery,
            role: "user",
            conversationId: conversation._id,
        });

        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Content-Type", "text/event-stream");

        res.write("\n<CONVERSATION_ID>\n");
        res.write(
            JSON.stringify({ conversationId: conversation._id.toString() })
        );
        res.write("\n</CONVERSATION_ID>\n");

        res.write("\n<SOURCES>\n");
        res.write(
            JSON.stringify(
                webSearchResults.map((result) => ({ url: result.url }))
            )
        );
        res.write("\n</SOURCES>\n");

        const result = streamText({
            model: "openai/gpt-5.4",
            prompt,
            system: SYSTEM_PROMPT,
        });

        let assistantResponse = "";

        for await (const textPart of result.textStream) {
            assistantResponse += textPart;
            res.write(textPart);
        }

        if (assistantResponse.trim()) {
            await Message.create({
                content: assistantResponse,
                role: "assistant",
                conversationId: conversation._id,
            });
        }

        res.end();
    } catch (error) {
        console.error("Error in ask controller:", error);

        if (!res.headersSent) {
            return res
                .status(500)
                .json({ success: false, message: "Internal server error" });
        }

        res.end();
    }
};

const askFollowUp = async (req: Request, res: Response) => {
    try {
        const { query } = req.body as { query?: string };
        const { conversationId } = req.params as { conversationId?: string };

        if (!req.user?._id) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized request" });
        }

        if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Valid conversationId is required",
            });
        }

        if (!query || typeof query !== "string" || !query.trim()) {
            return res
                .status(400)
                .json({ success: false, message: "Query is required" });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId: req.user._id,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .select("role content");

        const normalizedQuery = query.trim();

        await Message.create({
            content: normalizedQuery,
            role: "user",
            conversationId,
        });

        const prompt = buildHistoryPrompt(
            messages.map((message) => ({
                role: message.role,
                content: message.content,
            })),
            normalizedQuery
        );

        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Content-Type", "text/event-stream");

        const result = streamText({
            model: "openai/gpt-5.4",
            prompt,
            system: SYSTEM_PROMPT,
        });

        let assistantResponse = "";

        for await (const textPart of result.textStream) {
            assistantResponse += textPart;
            res.write(textPart);
        }

        if (assistantResponse.trim()) {
            await Message.create({
                content: assistantResponse,
                role: "assistant",
                conversationId,
            });
        }

        await Conversation.findByIdAndUpdate(conversationId, {
            updatedAt: new Date(),
        });

        res.end();
    } catch (error) {
        console.error("Error in askFollowUp controller:", error);

        if (!res.headersSent) {
            return res
                .status(500)
                .json({ success: false, message: "Internal server error" });
        }

        res.end();
    }
};

const getAllConversations = async (req: Request, res: Response) => {
    try {
        if (!req.user?._id) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized request" });
        }

        const conversations = await Conversation.find({ userId: req.user._id })
            .sort({ updatedAt: -1 })
            .select("title createdAt updatedAt");

        return res.status(200).json({
            success: true,
            conversations,
        });
    } catch (error) {
        console.error("Error in getAllConversations controller:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};

const getConversation = async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params as { conversationId?: string };

        if (!req.user?._id) {
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized request" });
        }

        if (!conversationId || !Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({
                success: false,
                message: "Valid conversationId is required",
            });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            userId: req.user._id,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: "Conversation not found",
            });
        }

        const messages = await Message.find({
            conversationId: conversationId,
        })
            .sort({ createdAt: 1 })
            .select("content role createdAt updatedAt");

        return res.status(200).json({
            success: true,
            conversation,
            messages,
        });
    } catch (error) {
        console.error("Error in getConversation controller:", error);
        return res
            .status(500)
            .json({ success: false, message: "Internal server error" });
    }
};

export { ask, askFollowUp, getAllConversations, getConversation };
