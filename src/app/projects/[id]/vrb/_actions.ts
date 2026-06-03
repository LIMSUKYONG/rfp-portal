"use server";

import { revalidatePath } from "next/cache";
import { approveVrb, updateDeptReview } from "@/lib/api/vrb";

export async function saveDeptReview(
  deptId: string,
  update: { proceed_opinion?: string; risk_level?: number },
) {
  const res = await updateDeptReview(deptId, update);
  revalidatePath("/projects/[id]/vrb", "page");
  return res;
}

export async function submitVrbDecision(
  projectId: string,
  vrbId: string,
  approved: boolean,
  rejectReason?: string,
) {
  const res = await approveVrb(projectId, vrbId, approved, rejectReason);
  revalidatePath("/projects/[id]", "layout");
  return res;
}
