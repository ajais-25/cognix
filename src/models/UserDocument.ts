import mongoose, { Schema, Document, Types } from "mongoose";

export interface UserDocument extends Document {
  userId: Types.ObjectId;
  b2Key: string;
  fileName: string;
  fileSize: number;
  status: "pending" | "processing" | "ready" | "failed";
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
    b2Key: {
      type: String,
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
    status: {
      type: String,
      enum: ["pending", "processing", "ready", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const UserDocument =
  (mongoose.models.UserDocument as mongoose.Model<UserDocument>) ||
  mongoose.model<UserDocument>("UserDocument", userDocumentSchema);

export default UserDocument;
