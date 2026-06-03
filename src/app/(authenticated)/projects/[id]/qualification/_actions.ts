"use server";

import { revalidatePath } from "next/cache";
import {
  updateCheckStatus,
  confirmQualificationPass,
  updateProjectPhase,
} from "@/lib/api/qualification";

export async function toggleCheckResult(checkId: string, result: "pass" | "pending") {
  const res = await updateCheckStatus(checkId, result);
  revalidatePath("/projects/[id]/qualification", "page");
  return res;
}

export async function confirmAllPass(projectId: string) {
  const res = await confirmQualificationPass(projectId);
  revalidatePath("/projects/[id]", "layout");
  return res;
}

export async function setPhaseQualificationCheck(projectId: string) {
  const res = await updateProjectPhase(projectId, "qualification_check");
  revalidatePath("/projects/[id]", "layout");
  return res;
}
