import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://localhost:8000";

export const uploadPdfToRag = async (filePath: string, sessionId: string) => {
    try {
        const formData = new FormData();
        formData.append("file", fs.createReadStream(filePath));
        formData.append("session_id", sessionId);

        const response = await axios.post(
            `${RAG_SERVICE_URL}/upload`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                },
            }
        );

        return response.data;
    } catch (error) {
        console.error("Error uploading to RAG service:", error);
        throw error;
    }
};

export const chatWithRag = async (query: string, sessionId: string) => {
    try {
        const response = await axios.post(
            `${RAG_SERVICE_URL}/chat`,
            {
                query,
                session_id: sessionId,
            },
            {
                responseType: "stream",
            }
        );

        return response.data; // this is now a readable stream
    } catch (error) {
        console.error("Error chatting with RAG service:", error);
        throw error;
    }
};
