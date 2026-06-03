export const PHASE_STYLE: Record<string, string> = {
  rfp_registered: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  track_a_done: "bg-green-100 text-green-700 border-green-200",
  vrb_approved: "bg-purple-100 text-purple-700 border-purple-200",
  price_ready: "bg-yellow-100 text-yellow-700 border-yellow-200",
  bid_submitted: "bg-orange-100 text-orange-700 border-orange-200",
  selected: "bg-emerald-100 text-emerald-700 border-emerald-200",
  lost: "bg-red-100 text-red-700 border-red-200",
  abandoned: "bg-gray-200 text-gray-500 border-gray-300",
  contract_signed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export const PHASE_LABEL: Record<string, string> = {
  rfp_registered: "RFP 등록",
  in_progress: "진행 중",
  track_a_done: "트랙A 완료",
  vrb_approved: "VRB 승인",
  price_ready: "가격 확정",
  bid_submitted: "입찰 제출",
  selected: "선정",
  lost: "탈락",
  abandoned: "포기",
  contract_signed: "계약 체결",
};

export function computeDday(deadline: string | null): string {
  if (!deadline) return "-";
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return "D-Day";
  return `D+${Math.abs(diff)}`;
}

export function formatKrw(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
}
