import mongoose, { Schema, Document, Types } from "mongoose";

export interface UserDocument extends Document {
  userId: Types.ObjectId;
  fileName: string;
  fileSize: number;
  totalChunks?: number;
  status: "processing" | "ready" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const userDocumentSchema: Schema<UserDocument> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    totalChunks: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    },
  },
  { timestamps: true },
);

const UserDocument =
  (mongoose.models.UserDocument as mongoose.Model<UserDocument>) ||
  mongoose.model<UserDocument>("UserDocument", userDocumentSchema);

export default UserDocument;
