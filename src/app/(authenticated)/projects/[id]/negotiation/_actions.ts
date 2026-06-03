"use server";
import { revalidatePath } from "next/cache";
import { addNegotiationRound, confirmFinalPrice } from "@/lib/api/negotiations";

export async function addRound(projectId: string, data: {
  negotiation_date?: string; deadline?: string; scope_changes?: string;
  price_changes?: string; final_amount?: number; negotiation_status?: string;
}) {
  const res = await addNegotiationRound(projectId, data);
  revalidatePath("/projects/[id]/negotiation", "page");
  return res;
}

export async function confirmNegotiation(projectId: string, finalAmount: number) {
  const res = await confirmFinalPrice(projectId, finalAmount);
  revalidatePath("/projects/[id]", "layout");
  return res;
}
