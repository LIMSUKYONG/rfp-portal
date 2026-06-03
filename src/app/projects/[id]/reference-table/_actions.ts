"use server";

import { revalidatePath } from "next/cache";
import { updateRefTableItem } from "@/lib/api/reference-table";

export async function saveRefItem(
  itemId: string,
  update: {
    proposal_page?: string | null;
    impl_type?: string | null;
    impl_type_display?: string | null;
    description?: string | null;
    reviewed?: boolean;
  },
) {
  const res = await updateRefTableItem(itemId, update);
  revalidatePath("/projects/[id]/reference-table", "page");
  return res;
}
