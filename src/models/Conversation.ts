import mongoose, { Schema, Document, Types } from "mongoose";

export interface Conversation extends Document {
  userId: Types.ObjectId;
  title?: string;
  type: "chat" | "document";
  documentId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema: Schema<Conversation> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
    },
    type: {
      type: String,
      enum: ["chat", "document"],
      default: "chat",
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "UserDocument",
      default: null,
    },
  },
  { timestamps: true },
);

const Conversation =
  (mongoose.models.Conversation as mongoose.Model<Conversation>) ||
  mongoose.model<Conversation>("Conversation", conversationSchema);

export default Conversation;
