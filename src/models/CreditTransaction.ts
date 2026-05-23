import mongoose, { Schema, Document, Types } from "mongoose";

interface CreditTransaction extends Document {
    userId: Types.ObjectId;
    amount: number;
    type: 'topup' | 'deduction' | 'refund' | 'bonus';
    balanceAfter: number;
    // Only present on query deductions
    tokenMeta?: {
        promptTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
    // Only present on upload deductions
    uploadMeta?: {
        totalChunks: number;
        creditsPerChunk: number;
    };
    referenceId?: Types.ObjectId;           // conversationId or documentId
    createdAt: Date;
    updatedAt: Date;
}

const creditTransactionSchema: Schema<CreditTransaction> = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ["topup", "deduction", "refund", "bonus"]
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    tokenMeta: {
        type: {
            promptTokens: {
                type: Number,
                required: true
            },
            outputTokens: {
                type: Number,
                required: true
            },
            totalTokens: {
                type: Number,
                required: true
            }
        }
    },
    uploadMeta: {
        type: {
            totalChunks: {
                type: Number,
                required: true
            },
            creditsPerChunk: {
                type: Number,
                required: true
            }
        }
    },
    referenceId: {
        type: Schema.Types.ObjectId
    },
}, { timestamps: true });

const CreditTransaction =
    (mongoose.models.CreditTransaction as mongoose.Model<CreditTransaction>) ||
    mongoose.model<CreditTransaction>("CreditTransaction", creditTransactionSchema);

export default CreditTransaction;
