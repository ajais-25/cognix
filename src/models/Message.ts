import mongoose, { Schema, Document, Types } from "mongoose";

export interface Source extends Document {
  title: string;
  url: string;
  content: string;
  rawContent: string | null;
  score: number;
}

export interface Message extends Document {
  conversationId: Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  followUps?: string[];
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
    sources: {
      type: [
        {
          title: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
          rawContent: {
            type: String,
            default: null,
          },
          score: {
            type: Number,
            required: true,
          },
        },
      ],
      default: undefined,
    },
    followUps: {
      type: [String],
      default: undefined,
    },

  },
  { timestamps: true },
);

const Message =
  (mongoose.models.Message as mongoose.Model<Message>) ||
  mongoose.model<Message>("Message", messageSchema);

export default Message;
