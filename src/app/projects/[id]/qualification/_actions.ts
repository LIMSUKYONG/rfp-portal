"use server";

import {
  updateCheckStatus,
  confirmQualificationPass,
  updateProjectPhase,
} from "@/lib/api/qualification";

export async function toggleCheckResult(checkId: string, result: "pass" | "pending") {
  return updateCheckStatus(checkId, result);
}

export async function confirmAllPass(projectId: string) {
  return confirmQualificationPass(projectId);
}

export async function setPhaseQualificationCheck(projectId: string) {
  return updateProjectPhase(projectId, "qualification_check");
}
