import mongoose, { Schema, Document, Types } from "mongoose";

export interface Message extends Document {
  conversationId: Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema: Schema<Message> = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

const Message =
  (mongoose.models.Message as mongoose.Model<Message>) ||
  mongoose.model<Message>("Message", messageSchema);

export default Message;
