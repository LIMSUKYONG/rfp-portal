"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectPhase } from "@/lib/types/database";

const PHASE_OPTIONS: { value: ProjectPhase | "all"; label: string }[] = [
  { value: "all", label: "전체 단계" },
  { value: "rfp_registered", label: "RFP 등록" },
  { value: "in_progress", label: "진행 중" },
  { value: "track_a_done", label: "트랙A 완료" },
  { value: "vrb_approved", label: "VRB 승인" },
  { value: "price_ready", label: "가격 확정" },
  { value: "bid_submitted", label: "입찰 제출" },
  { value: "selected", label: "선정" },
  { value: "lost", label: "탈락" },
  { value: "abandoned", label: "포기" },
  { value: "contract_signed", label: "계약 체결" },
];

export function PhaseFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("phase") ?? "all";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("phase");
    } else {
      params.set("phase", value);
    }
    router.push(`/projects?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]" data-testid="filter-phase">
        <SelectValue placeholder="단계 필터" />
      </SelectTrigger>
      <SelectContent>
        {PHASE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
