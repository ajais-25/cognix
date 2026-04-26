import type { User as UserDocument } from "../models/user.model.ts";

declare global {
    namespace Express {
        interface Request {
            user?: UserDocument;
        }
    }
}

export {};
