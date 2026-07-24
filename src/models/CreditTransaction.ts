import mongoose, { Schema, Document, Types } from "mongoose";

export interface ItemizedCallRecord {
  callType: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
  baseCostUsd: number;
  billedUsd: number;
}

export interface CreditTransaction extends Document {
  userId: Types.ObjectId;
  amount: number; // USD billed amount
  type: "topup" | "deduction" | "refund" | "bonus";
  balanceAfter: number;
  baseCostUsd?: number;
  marginPercent?: number;
  breakdown?: ItemizedCallRecord[];
  tokenMeta?: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  uploadMeta?: {
    totalChunks: number;
    totalTokens?: number;
  };
  referenceId?: Types.ObjectId; // conversationId or documentId
  createdAt: Date;
  updatedAt: Date;
}

const creditTransactionSchema: Schema<CreditTransaction> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["topup", "deduction", "refund", "bonus"],
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    baseCostUsd: {
      type: Number,
    },
    marginPercent: {
      type: Number,
    },
    breakdown: [
      {
        callType: { type: String, required: true },
        model: { type: String, required: true },
        promptTokens: { type: Number, required: true },
        outputTokens: { type: Number, required: true },
        thinkingTokens: { type: Number },
        baseCostUsd: { type: Number, required: true },
        billedUsd: { type: Number, required: true },
      },
    ],
    tokenMeta: {
      type: {
        promptTokens: {
          type: Number,
          required: true,
        },
        outputTokens: {
          type: Number,
          required: true,
        },
        totalTokens: {
          type: Number,
          required: true,
        },
      },
    },
    uploadMeta: {
      type: {
        totalChunks: {
          type: Number,
          required: true,
        },
        totalTokens: {
          type: Number,
        },
      },
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

const CreditTransaction =
  (mongoose.models.CreditTransaction as mongoose.Model<CreditTransaction>) ||
  mongoose.model<CreditTransaction>(
    "CreditTransaction",
    creditTransactionSchema,
  );

export default CreditTransaction;
