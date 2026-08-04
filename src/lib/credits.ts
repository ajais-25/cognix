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

function buildBreakdown(itemizedCalls: CallUsageParam[]): {
  breakdownRecords: ItemizedCallRecord[];
  totalBaseCostUsd: number;
  totalBilledUsd: number;
} {
  let totalBaseCostUsd = 0;
  let totalBilledUsd = 0;

  const breakdownRecords: ItemizedCallRecord[] = itemizedCalls.map((call) => {
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
  });

  return {
    breakdownRecords,
    totalBaseCostUsd: parseFloat(totalBaseCostUsd.toFixed(8)),
    totalBilledUsd: parseFloat(totalBilledUsd.toFixed(6)),
  };
}

/**
 * Deducts USD credits after an AI query execution based on actual itemized token usages.
 */
export async function deductQueryCredits(params: {
  userId: string;
  itemizedCalls: CallUsageParam[];
  referenceId?: string;
}): Promise<{
  creditsDeducted: number;
  newBalance: number;
  lowBalance: boolean;
}> {
  let freshUser;
  try {
    freshUser = await User.findById(params.userId);
  } catch (err) {
    console.error(
      `[deductQueryCredits] Failed to fetch user ${params.userId} from DB. Skipping credit deduction.`,
      err,
    );
    return { creditsDeducted: 0, newBalance: 0, lowBalance: true };
  }
  if (!freshUser) {
    throw new Error(`User ${params.userId} not found`);
  }

  const balance = freshUser.credits;

  const { breakdownRecords, totalBaseCostUsd, totalBilledUsd } = buildBreakdown(
    params.itemizedCalls,
  );

  // Cap deduction at current balance so balance never drops below 0 cleanly
  const creditsDeducted = parseFloat(
    Math.min(totalBilledUsd, Math.max(0, balance)).toFixed(6),
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
    (updatedUser?.credits ?? balance - creditsDeducted).toFixed(6),
  );

  const promptTokensSum = params.itemizedCalls.reduce(
    (acc, c) => acc + c.promptTokens,
    0,
  );
  const outputTokensSum = params.itemizedCalls.reduce(
    (acc, c) => acc + c.outputTokens,
    0,
  );

  try {
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
  } catch (err) {
    console.error(
      `[deductQueryCredits] CRITICAL: Failed to record transaction after deducting $${creditsDeducted} from user ${params.userId}. ` +
        `Balance was updated to ~${newBalance} but no CreditTransaction was saved. Manual reconciliation required.`,
      err,
    );
  }

  return { creditsDeducted, newBalance, lowBalance: isLowBalance(newBalance) };
}

/**
 * Deducts USD credits after a PDF document upload execution based on actual token usages.
 */
export async function deductUploadCredits(params: {
  userId: string;
  itemizedCalls: CallUsageParam[];
  totalChunks: number;
  referenceId?: string;
}): Promise<{
  creditsDeducted: number;
  newBalance: number;
  lowBalance: boolean;
}> {
  let freshUser;
  try {
    freshUser = await User.findById(params.userId);
  } catch (err) {
    console.error(
      `[deductUploadCredits] Failed to fetch user ${params.userId} from DB. Skipping credit deduction.`,
      err,
    );
    return { creditsDeducted: 0, newBalance: 0, lowBalance: true };
  }
  if (!freshUser) {
    throw new Error(`User ${params.userId} not found`);
  }

  const balance = freshUser.credits;

  const { breakdownRecords, totalBaseCostUsd, totalBilledUsd } = buildBreakdown(
    params.itemizedCalls,
  );

  const creditsDeducted = parseFloat(
    Math.min(totalBilledUsd, Math.max(0, balance)).toFixed(6),
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
    (updatedUser?.credits ?? balance - creditsDeducted).toFixed(6),
  );

  const totalTokensSum = params.itemizedCalls.reduce(
    (acc, c) => acc + c.promptTokens + c.outputTokens,
    0,
  );

  try {
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
  } catch (err) {
    console.error(
      `[deductUploadCredits] CRITICAL: Failed to record transaction after deducting $${creditsDeducted} from user ${params.userId}. ` +
        `Balance was updated to ~${newBalance} but no CreditTransaction was saved. Manual reconciliation required.`,
      err,
    );
  }

  return { creditsDeducted, newBalance, lowBalance: isLowBalance(newBalance) };
}
