"use server";
import { revalidatePath } from "next/cache";
import { resolveRisk } from "@/lib/api/dashboard";

export async function markRiskResolved(riskId: string) {
  const res = await resolveRisk(riskId);
  revalidatePath("/dashboard", "page");
  return res;
}
