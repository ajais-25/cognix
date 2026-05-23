import mongoose, { Schema, Document } from "mongoose";

export interface User extends Document {
  name: string;
  email: string;
  password: string;
  credits: number;
  verifyCode: string;
  verifyCodeExpiry: Date;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema: Schema<User> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please use a valid email address",
      ],
    },
    password: {
      type: String,
      required: true,
      unique: true,
    },
    credits: {
      type: Number,
      required: true,
      default: 200,
      min: 0,
    },
    verifyCode: String,
    verifyCodeExpiry: Date,
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true },
);

const User =
  (mongoose.models.User as mongoose.Model<User>) ||
  mongoose.model<User>("User", userSchema);

export default User;
