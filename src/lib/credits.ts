import CreditTransaction, {
  ItemizedCallRecord,
} from "@/models/CreditTransaction";
import User from "@/models/User";
import { calculateTokenCostUsd, getProfitMarginPercent } from "./pricingConfig";

export const MINIMUM_REQUIRED_BALANCE = Number(
  process.env.MINIMUM_REQUIRED_BALANCE!,
);

const LOW_BALANCE_THRESHOLD = Number(process.env.LOW_BALANCE_THRESHOLD!);

export function isLowBalance(credits: number): boolean {
  return credits <= LOW_BALANCE_THRESHOLD;
}

export function hasSufficientBalance(
  credits: number,
  minBalance: number = MINIMUM_REQUIRED_BALANCE,
): boolean {
  return credits >= minBalance;
}

export interface CallUsageParam {
  callType: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  thinkingTokens?: number;
}

/**
 * Deducts USD credits after an AI query execution based on actual itemized token usages.
 */
// TODO: fix the balance parameter
export async function deductQueryCredits(params: {
  userId: string;
  balance: number;
  itemizedCalls: CallUsageParam[];
  referenceId?: string;
}): Promise<{
  creditsDeducted: number;
  newBalance: number;
  lowBalance: boolean;
}> {
  let totalBaseCostUsd = 0;
  let totalBilledUsd = 0;

  const breakdownRecords: ItemizedCallRecord[] = params.itemizedCalls.map(
    (call) => {
      const pricing = calculateTokenCostUsd(
        call.model,
        call.promptTokens,
        call.outputTokens,
      );
      totalBaseCostUsd += pricing.baseCostUsd;
      totalBilledUsd += pricing.billedCostUsd;

      return {
        callType: call.callType,
        model: call.model,
        promptTokens: call.promptTokens,
        outputTokens: call.outputTokens,
        thinkingTokens: call.thinkingTokens,
        baseCostUsd: pricing.baseCostUsd,
        billedUsd: pricing.billedCostUsd,
      };
    },
  );

  totalBaseCostUsd = parseFloat(totalBaseCostUsd.toFixed(8));
  totalBilledUsd = parseFloat(totalBilledUsd.toFixed(6));

  // Cap deduction at current balance so balance never drops below 0 cleanly
  const creditsDeducted = parseFloat(
    Math.min(totalBilledUsd, Math.max(0, params.balance)).toFixed(6),
  );

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
    (updatedUser?.credits ?? params.balance - creditsDeducted).toFixed(6),
  );

  const promptTokensSum = params.itemizedCalls.reduce(
    (acc, c) => acc + c.promptTokens,
    0,
  );
  const outputTokensSum = params.itemizedCalls.reduce(
    (acc, c) => acc + c.outputTokens,
    0,
  );

  await CreditTransaction.create({
    userId: params.userId,
    amount: -creditsDeducted,
    type: "deduction",
    balanceAfter: newBalance,
    baseCostUsd: totalBaseCostUsd,
    marginPercent: getProfitMarginPercent(),
    breakdown: breakdownRecords,
    tokenMeta: {
      promptTokens: promptTokensSum,
      outputTokens: outputTokensSum,
      totalTokens: promptTokensSum + outputTokensSum,
    },
    referenceId: params.referenceId,
  });

  return { creditsDeducted, newBalance, lowBalance: isLowBalance(newBalance) };
}

/**
 * Deducts USD credits after a PDF document upload execution based on actual token usages.
 */
// TODO: fix the balance parameter
export async function deductUploadCredits(params: {
  userId: string;
  balance: number;
  itemizedCalls: CallUsageParam[];
  totalChunks: number;
  referenceId?: string;
}) {
  let totalBaseCostUsd = 0;
  let totalBilledUsd = 0;

  const breakdownRecords: ItemizedCallRecord[] = params.itemizedCalls.map(
    (call) => {
      const pricing = calculateTokenCostUsd(
        call.model,
        call.promptTokens,
        call.outputTokens,
      );
      totalBaseCostUsd += pricing.baseCostUsd;
      totalBilledUsd += pricing.billedCostUsd;

      return {
        callType: call.callType,
        model: call.model,
        promptTokens: call.promptTokens,
        outputTokens: call.outputTokens,
        thinkingTokens: call.thinkingTokens,
        baseCostUsd: pricing.baseCostUsd,
        billedUsd: pricing.billedCostUsd,
      };
    },
  );

  totalBaseCostUsd = parseFloat(totalBaseCostUsd.toFixed(8));
  totalBilledUsd = parseFloat(totalBilledUsd.toFixed(6));

  const creditsDeducted = parseFloat(
    Math.min(totalBilledUsd, Math.max(0, params.balance)).toFixed(6),
  );

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
    (updatedUser?.credits ?? params.balance - creditsDeducted).toFixed(6),
  );

  const totalTokensSum = params.itemizedCalls.reduce(
    (acc, c) => acc + c.promptTokens + c.outputTokens,
    0,
  );

  await CreditTransaction.create({
    userId: params.userId,
    amount: -creditsDeducted,
    type: "deduction",
    balanceAfter: newBalance,
    baseCostUsd: totalBaseCostUsd,
    marginPercent: getProfitMarginPercent(),
    breakdown: breakdownRecords,
    uploadMeta: {
      totalChunks: params.totalChunks,
      totalTokens: totalTokensSum,
    },
    referenceId: params.referenceId,
  });
}
