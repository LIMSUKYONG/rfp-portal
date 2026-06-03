import { describe, it, expect, afterAll } from "vitest";
import { createAdminClient, testId } from "./helpers";

const supabase = createAdminClient();
let projectId: string | undefined;

afterAll(async () => {
  if (projectId) await supabase.from("rfp_projects").delete().eq("id", projectId);
});

describe("Project Flow", () => {
  it("should insert a project", async () => {
    const code = `PF-${testId()}`;
    const { data, error } = await supabase
      .from("rfp_projects")
      .insert({ code, name: `프로젝트 ${code}`, client: "테스트", phase: "rfp_registered" })
      .select("id, phase").single();
    expect(error).toBeNull();
    expect(data!.phase).toBe("rfp_registered");
    projectId = data!.id;
  });

  it("should transition to qualification_check", async () => {
    const { data, error } = await supabase.from("rfp_projects").update({ phase: "qualification_check" }).eq("id", projectId!).select("phase").single();
    expect(error).toBeNull();
    expect(data!.phase).toBe("qualification_check");
  });

  it("should transition to in_progress", async () => {
    const { data, error } = await supabase.from("rfp_projects").update({ phase: "in_progress" }).eq("id", projectId!).select("phase").single();
    expect(error).toBeNull();
    expect(data!.phase).toBe("in_progress");
  });

  it("should insert and query rfp_rules", async () => {
    const { data, error } = await supabase.from("rfp_rules").insert({
      project_id: projectId!, rule_type: "qualification", rule_target: "실적", condition_value: { min: 2 }, source_type: "ai_extracted",
    }).select("id, rule_type").single();
    expect(error).toBeNull();
    expect(data!.rule_type).toBe("qualification");
    await supabase.from("rfp_rules").delete().eq("id", data!.id);
  });
});
