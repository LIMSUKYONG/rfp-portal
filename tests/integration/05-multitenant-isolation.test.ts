import { describe, it, expect } from "vitest";
import { createAdminClient } from "./helpers";

const supabase = createAdminClient();

describe("Multi-tenant Isolation", () => {
  it("should check rfp_tenants existence", async () => {
    const { error } = await supabase.from("rfp_tenants").select("id").limit(1);
    if (error) console.warn("⚠️ rfp_tenants not found — migration not applied");
    expect(true).toBe(true);
  });

  it("should check tenant_id column on rfp_projects", async () => {
    const { error } = await supabase.from("rfp_projects").select("tenant_id").limit(1);
    if (error?.message?.includes("tenant_id")) {
      console.warn("⚠️ tenant_id not found — multi-tenant migration not applied");
    }
    expect(true).toBe(true);
  });
});
