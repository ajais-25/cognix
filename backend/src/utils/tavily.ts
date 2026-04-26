import { tavily } from "@tavily/core";

let tavilyClient: ReturnType<typeof tavily> | null = null;

const getTavilyClient = () => {
    const apiKey = process.env.TAVILY_API_KEY?.trim();

    if (!apiKey) {
        throw new Error(
            "Missing TAVILY_API_KEY. Add it to your environment or backend/.env file."
        );
    }

    if (!tavilyClient) {
        tavilyClient = tavily({ apiKey });
    }

    return tavilyClient;
};

export { getTavilyClient };
