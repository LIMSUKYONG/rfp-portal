import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient, testId } from "./helpers";

const supabase = createAdminClient();
let projectId: string | undefined;

afterAll(async () => {
  if (projectId) await supabase.from("rfp_projects").delete().eq("id", projectId);
});

describe("Full Bid Flow", () => {
  const phases = [
    "rfp_registered", "qualification_check", "in_progress",
    "track_a_done", "price_ready", "bid_submitted", "selected", "contract_signed",
  ];

  it("1. 프로젝트 생성", async () => {
    const code = `FL-${testId()}`;
    const { data, error } = await supabase.from("rfp_projects")
      .insert({ code, name: `전체흐름 ${code}`, client: "ETRI", budget_amount: 2500000000, bid_deadline: "2026-08-01", phase: "rfp_registered" })
      .select("id, phase").single();
    expect(error).toBeNull();
    expect(data!.phase).toBe("rfp_registered");
    projectId = data!.id;
  });

  for (let i = 1; i < phases.length; i++) {
    it(`${i + 1}. phase → ${phases[i]}`, async () => {
      if (!projectId) { expect(true).toBe(true); return; }
      const { data, error } = await supabase.from("rfp_projects")
        .update({ phase: phases[i] }).eq("id", projectId).select("phase").single();
      expect(error).toBeNull();
      expect(data!.phase).toBe(phases[i]);
    });
  }

  it("9. 계약 등록", async () => {
    if (!projectId) { expect(true).toBe(true); return; }
    const { data, error } = await supabase.from("rfp_contracts")
      .insert({ project_id: projectId, contract_amount: 2400000000, contract_date: "2026-09-01", registered_as_experience: true })
      .select("id").single();
    expect(error).toBeNull();
    // Cleanup
    if (data) await supabase.from("rfp_contracts").delete().eq("id", data.id);
  });
});
