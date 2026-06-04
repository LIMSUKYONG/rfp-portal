"use server";

import { revalidatePath } from "next/cache";
import {
  confirmQualificationPass,
  updateProjectPhase,
} from "@/lib/api/qualification";

// 체크 결과 업데이트는 PATCH /api/qualification-checks/[id] 로 처리한다.
// (qualification.client.ts > setCheckResult)

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
