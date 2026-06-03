"use server";

import { revalidatePath } from "next/cache";
import { updateRuleValue, confirmRule } from "@/lib/api/rules";

export async function saveRuleValue(
  ruleId: string,
  update: { condition_value?: Record<string, unknown>; rule_target?: string },
) {
  const res = await updateRuleValue(ruleId, {
    ...update,
    source_type: "manual",
  });
  revalidatePath("/projects/[id]/rules-review", "page");
  return res;
}

export async function confirmRuleAction(ruleId: string) {
  const res = await confirmRule(ruleId);
  revalidatePath("/projects/[id]/rules-review", "page");
  revalidatePath("/projects/[id]", "layout");
  return res;
}
