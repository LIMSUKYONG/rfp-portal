"use server";

import { createProject, type CreateProjectInput } from "@/lib/api/rfp";

export async function saveProject(input: CreateProjectInput) {
  return createProject(input);
}
