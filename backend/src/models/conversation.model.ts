import { Document, model, Schema, Types } from "mongoose";

export interface Conversation extends Document {
    title: string;
    userId: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

const conversationSchema: Schema<Conversation> = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Conversation = model<Conversation>("Conversation", conversationSchema);

export default Conversation;
