import mongoose, { Schema, Document, Types } from "mongoose";

export interface Order extends Document {
  userId: Types.ObjectId;
  orderId: string;
  paymentId?: string;
  amount: number;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema: Schema<Order> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    paymentId: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const Order =
  (mongoose.models.Order as mongoose.Model<Order>) ||
  mongoose.model<Order>("Order", orderSchema);

export default Order;
