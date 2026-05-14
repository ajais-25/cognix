import mongoose, { Schema, Document, Types } from "mongoose";

export interface PasswordReset extends Document {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const passwordResetSchema: Schema<PasswordReset> = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    required: true,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: "15m",
  },
});

const PasswordReset =
  (mongoose.models.PasswordReset as mongoose.Model<PasswordReset>) ||
  mongoose.model<PasswordReset>("PasswordReset", passwordResetSchema);

export default PasswordReset;
