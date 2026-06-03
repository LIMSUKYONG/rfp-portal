"use server";

import {
  createPartner,
  deletePartner,
  type CreatePartnerInput,
} from "@/lib/api/partners";

export async function addPartner(input: CreatePartnerInput) {
  return createPartner(input);
}

export async function removePartner(partnerId: string) {
  return deletePartner(partnerId);
}
