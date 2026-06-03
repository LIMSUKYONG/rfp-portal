"use server";
import { revalidatePath } from "next/cache";
import { saveContract, sendTelegramNotification } from "@/lib/api/contracts";

export async function submitContract(projectId: string, data: {
  contract_amount: number; contract_date: string; start_date?: string;
  end_date?: string; warranty_end_date?: string; advance_rate?: number;
  advance_amount?: number; contract_file_url?: string; contract_file_size_mb?: number;
}, projectName: string) {
  const res = await saveContract(projectId, data);
  if (!res.error) {
    await sendTelegramNotification(projectName, data.contract_amount);
  }
  revalidatePath("/projects/[id]", "layout");
  return res;
}
