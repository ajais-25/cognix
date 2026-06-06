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
  return parseFloat(
    (((inputTokens + OUTPUT_BUFFER_TOKENS) / 1000) * CREDITS_PER_1K_TOKENS).toFixed(2),
  );
}

export function estimateUploadCost(totalChunks: number): number {
  return totalChunks * CREDITS_PER_CHUNK;
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
  const rawCost = parseFloat(
    ((params.tokenMeta.totalTokens / 1000) * CREDITS_PER_1K_TOKENS).toFixed(2),
  );
  const creditsDeducted = parseFloat(Math.min(rawCost, params.balance).toFixed(2)); // safety cap

  const updatedUser = await User.findByIdAndUpdate(
    params.userId,
    { $inc: { credits: -creditsDeducted } },
    { returnDocument: "after" },
  );

  if (!updatedUser) {
    console.warn(
      `[deductQueryCredits] User ${params.userId} not found after update — balanceAfter in transaction log may be inaccurate`,
    );
  }

  const newBalance = parseFloat(
    (updatedUser?.credits ?? params.balance - creditsDeducted).toFixed(2),
  );

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
  const rawCost = params.totalChunks * CREDITS_PER_CHUNK;
  const creditsDeducted = parseFloat(Math.min(rawCost, params.balance).toFixed(2)); // safety cap — prevents negative balance on race condition

  const updatedUser = await User.findByIdAndUpdate(
    params.userId,
    { $inc: { credits: -creditsDeducted } },
    { returnDocument: "after" },
  );

  if (!updatedUser) {
    console.warn(
      `[deductUploadCredits] User ${params.userId} not found after update — balanceAfter in transaction log may be inaccurate`,
    );
  }

  const newBalance = parseFloat(
    (updatedUser?.credits ?? params.balance - creditsDeducted).toFixed(2),
  );

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
