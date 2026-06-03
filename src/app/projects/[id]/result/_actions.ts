"use server";
import { revalidatePath } from "next/cache";
import { saveBidResult } from "@/lib/api/bid-results";

export async function submitResult(projectId: string, data: {
  result_type: string; actual_tech_score?: number; actual_price_score?: number;
  actual_total_score?: number; rank?: number; loss_reason?: string; loss_note?: string;
  submitted_price?: number; predicted_tech_score?: number; score_diff?: number;
}) {
  const res = await saveBidResult(projectId, data);
  revalidatePath("/projects/[id]", "layout");
  return res;
}
