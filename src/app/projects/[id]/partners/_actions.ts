"use server";

import { revalidatePath } from "next/cache";
import {
  createPartner,
  deletePartner,
  type CreatePartnerInput,
} from "@/lib/api/partners";

export async function addPartner(input: CreatePartnerInput) {
  const res = await createPartner(input);
  revalidatePath("/projects/[id]/partners", "page");
  revalidatePath("/projects/[id]", "layout");
  return res;
}

export async function removePartner(partnerId: string) {
  const res = await deletePartner(partnerId);
  revalidatePath("/projects/[id]/partners", "page");
  revalidatePath("/projects/[id]", "layout");
  return res;
}
