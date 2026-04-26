import { Document, model, Schema, Types } from "mongoose";

export interface Message extends Document {
    content: string;
    role: "user" | "assistant";
    conversationId: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const messageSchema: Schema<Message> = new Schema(
    {
        content: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ["user", "assistant"],
            required: true,
        },
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Message = model<Message>("Message", messageSchema);

export default Message;
