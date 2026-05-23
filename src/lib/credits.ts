import CreditTransaction from "@/models/CreditTransaction";
import User from "@/models/User";

const CREDITS_PER_1K_TOKENS = Number(process.env.CREDITS_PER_1K_TOKENS!);
const CREDITS_PER_CHUNK = Number(process.env.CREDITS_PER_CHUNK!);
const LOW_BALANCE_THRESHOLD = Number(process.env.LOW_BALANCE_THRESHOLD!);
const OUTPUT_BUFFER_TOKENS = Number(process.env.OUTPUT_BUFFER_TOKENS!); // assumed max output for pre-flight estimate

export function isLowBalance(credits: number): boolean {
  return credits <= LOW_BALANCE_THRESHOLD;
}

export function estimateQueryCost(inputTokens: number): number {
  return (
    Math.ceil((inputTokens + OUTPUT_BUFFER_TOKENS) / 1000) *
    CREDITS_PER_1K_TOKENS
  );
}

export async function deductQueryCredits(params: {
  userId: string;
  balance: number;
  tokenMeta: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  referenceId?: string;
}): Promise<{
  creditsDeducted: number;
  newBalance: number;
  lowBalance: boolean;
}> {
  const rawCost = Math.ceil(
    (params.tokenMeta.totalTokens / 1000) * CREDITS_PER_1K_TOKENS,
  );
  const creditsDeducted = Math.min(rawCost, params.balance); // safety cap

  const updatedUser = await User.findByIdAndUpdate(
    params.userId,
    { $inc: { credits: -creditsDeducted } },
    { new: true },
  );

  const newBalance = updatedUser?.credits ?? params.balance - creditsDeducted;

  await CreditTransaction.create({
    userId: params.userId,
    amount: -creditsDeducted,
    type: "deduction",
    balanceAfter: newBalance,
    tokenMeta: params.tokenMeta,
    referenceId: params.referenceId,
  });

  return { creditsDeducted, newBalance, lowBalance: isLowBalance(newBalance) };
}

export async function deductUploadCredits(params: {
  userId: string;
  balance: number;
  totalChunks: number;
  referenceId?: string;
}): Promise<{
  creditsDeducted: number;
  newBalance: number;
  lowBalance: boolean;
}> {
  const creditsDeducted = params.totalChunks * CREDITS_PER_CHUNK;

  const updatedUser = await User.findByIdAndUpdate(
    params.userId,
    { $inc: { credits: -creditsDeducted } },
    { new: true },
  );

  const newBalance = updatedUser?.credits ?? params.balance - creditsDeducted;

  await CreditTransaction.create({
    userId: params.userId,
    amount: -creditsDeducted,
    type: "deduction",
    balanceAfter: newBalance,
    uploadMeta: {
      totalChunks: params.totalChunks,
      creditsPerChunk: CREDITS_PER_CHUNK,
    },
    referenceId: params.referenceId,
  });

  return { creditsDeducted, newBalance, lowBalance: isLowBalance(newBalance) };
}
