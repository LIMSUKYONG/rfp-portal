"use server";

import { revalidatePath } from "next/cache";
import { completeTrackA } from "@/lib/api/proposals";

export async function markTrackAComplete(projectId: string) {
  const res = await completeTrackA(projectId);
  revalidatePath("/projects/[id]", "layout");
  return res;
}
