"use server";

import { revalidatePath } from "next/cache";
import { updateProfitLoss } from "@/lib/api/vrb";

export async function saveProfitLoss(
  projectId: string,
  update: {
    proposal_price?: number;
    expected_price?: number;
    license_cost?: number;
    direct_expense?: number;
    contingency?: number;
    other_cost?: number;
    target_margin_rate?: number;
  },
) {
  const res = await updateProfitLoss(projectId, update);
  revalidatePath("/projects/[id]/vrb/profit", "page");
  revalidatePath("/projects/[id]/vrb", "page");
  return res;
}
