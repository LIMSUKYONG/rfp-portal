import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient, testId } from "./helpers";

const supabase = createAdminClient();
let projectId: string | undefined;
let partnerId: string | undefined;
let plId: string | undefined;

afterAll(async () => {
  if (partnerId) await supabase.from("rfp_partners").delete().eq("id", partnerId);
  if (plId) await supabase.from("rfp_profit_loss").delete().eq("id", plId);
  if (projectId) await supabase.from("rfp_projects").delete().eq("id", projectId);
});

describe("Partners & Profit Triggers", () => {
  it("should create project with budget", async () => {
    const { data, error } = await supabase.from("rfp_projects")
      .insert({ code: `PL-${testId()}`, name: "손익테스트", client: "테스트", budget_amount: 1000000000 })
      .select("id").single();
    expect(error).toBeNull();
    projectId = data!.id;
  });

  it("should create profit_loss row", async () => {
    const { data, error } = await supabase.from("rfp_profit_loss")
      .insert({ project_id: projectId!, proposal_price: 900000000 }).select("id").single();
    expect(error).toBeNull();
    plId = data!.id;
  });

  it("should insert subcontract partner (trigger calculates sub_rate)", async () => {
    const { data, error } = await supabase.from("rfp_partners")
      .insert({ project_id: projectId!, partner_type: "subcontract", company_name: `업체${testId()}`, sub_amount: 200000000 })
      .select("id, sub_rate").single();
    expect(error).toBeNull();
    partnerId = data!.id;
    // trg_calc_sub_rate: 200M/1000M*100 = 20%
    expect(Number(data!.sub_rate)).toBe(20);
  });

  it("should verify trigger updated profit_loss outsource_cost", async () => {
    const { data, error } = await supabase.from("rfp_profit_loss")
      .select("outsource_cost").eq("project_id", projectId!).single();
    expect(error).toBeNull();
    expect(Number(data!.outsource_cost)).toBe(200000000);
  });
});
