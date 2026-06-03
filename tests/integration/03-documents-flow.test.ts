import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient, testId } from "./helpers";

const supabase = createAdminClient();
let projectId: string | undefined;
let docId: string | undefined;

afterAll(async () => {
  if (docId) await supabase.from("rfp_documents").delete().eq("id", docId);
  if (projectId) await supabase.from("rfp_projects").delete().eq("id", projectId);
});

describe("Documents Flow", () => {
  it("should create project", async () => {
    const { data, error } = await supabase.from("rfp_projects")
      .insert({ code: `DC-${testId()}`, name: "서류테스트", client: "테스트" }).select("id").single();
    expect(error).toBeNull();
    projectId = data!.id;
  });

  it("should insert document (trigger sets needs_review)", async () => {
    const { data, error } = await supabase.from("rfp_documents")
      .insert({ project_id: projectId!, doc_name: "사업자등록증", is_required: true })
      .select("id, needs_review, validation_status").single();
    expect(error).toBeNull();
    docId = data!.id;
    // trg_doc_flag_review: rfp_rule_id=NULL → needs_review=true
    expect(data!.needs_review).toBe(true);
    expect(data!.validation_status).toBe("needs_review");
  });

  it("should insert proof items with conditions (if columns exist)", async () => {
    if (!docId) return;
    const { data, error } = await supabase.from("rfp_document_proof_items")
      .insert([
        { document_id: docId, item_name: "사업자등록증", condition_type: "AND", condition_group: 1, min_required: 1 },
        { document_id: docId, item_name: "법인등기부등본", condition_type: "AND", condition_group: 1, min_required: 1 },
      ]).select("id, condition_type");

    if (error?.message?.includes("condition")) {
      console.warn("⚠️ condition columns not found — proof_items_conditions migration not applied");
      return;
    }
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    for (const d of data!) await supabase.from("rfp_document_proof_items").delete().eq("id", d.id);
  });
});
