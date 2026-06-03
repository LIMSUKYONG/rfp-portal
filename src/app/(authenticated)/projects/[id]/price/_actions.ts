"use server";
import { revalidatePath } from "next/cache";
import { savePriceSimulation, confirmBidPrice } from "@/lib/api/price";

export async function saveScenario(projectId: string, data: { selected_price: number; scenarios: Record<string, unknown>[]; tech_score?: number; budget_amount?: number }) {
  const res = await savePriceSimulation(projectId, data);
  revalidatePath("/projects/[id]/price", "page");
  return res;
}

export async function confirmBid(projectId: string) {
  const res = await confirmBidPrice(projectId);
  revalidatePath("/projects/[id]", "layout");
  return res;
}
