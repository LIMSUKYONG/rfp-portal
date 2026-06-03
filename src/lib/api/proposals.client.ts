/**
 * Client-safe proposal functions — no server-only imports.
 */

const PROPOSAL_BUCKET = "proposal-files";
const MAX_PROPOSAL_SIZE = 200 * 1024 * 1024; // 200MB

export async function uploadProposalFile(
  supabaseUrl: string,
  supabaseKey: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ path: string; error: string | null }> {
  if (file.size > MAX_PROPOSAL_SIZE) {
    return { path: "", error: "파일 크기가 200MB를 초과합니다." };
  }

  const path = `${crypto.randomUUID()}/${file.name}`;

  const signRes = await fetch(
    `${supabaseUrl}/storage/v1/object/upload/sign/${PROPOSAL_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  if (!signRes.ok) {
    const body = await signRes.text();
    return { path: "", error: `서명된 URL 생성 실패: ${body}` };
  }

  const { token } = (await signRes.json()) as { token: string };

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "PUT",
      `${supabaseUrl}/storage/v1/object/upload/${PROPOSAL_BUCKET}/${path}?token=${token}`,
    );
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ path, error: null });
      } else {
        resolve({ path: "", error: `업로드 실패 (${xhr.status})` });
      }
    });
    xhr.addEventListener("error", () => {
      resolve({ path: "", error: "네트워크 오류" });
    });
    xhr.send(file);
  });
}

export interface EvaluateProposalResponse {
  page_count: number | null;
  format_valid: boolean;
  format_issues: Record<string, unknown>[];
  has_reference_table: boolean;
  has_glossary: boolean;
  vague_expr_count: number;
  qualitative_score: number | null;
  quantitative_score: number | null;
  tech_score_total: number | null;
  threshold_pct: number | null;
  threshold_score: number | null;
  meets_threshold: boolean;
  coverage_rate: number | null;
  weak_items: Record<string, unknown>[];
  recommendations: Record<string, unknown>[];
  error?: string;
}

export async function evaluateProposal(
  projectId: string,
  storagePath: string,
  fileSizeMb: number,
): Promise<EvaluateProposalResponse> {
  const res = await fetch("/api/proposal/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, storagePath, fileSizeMb }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      page_count: null, format_valid: false, format_issues: [],
      has_reference_table: false, has_glossary: false, vague_expr_count: 0,
      qualitative_score: null, quantitative_score: null, tech_score_total: null,
      threshold_pct: null, threshold_score: null, meets_threshold: false,
      coverage_rate: null, weak_items: [], recommendations: [],
      error: `평가 실패: ${text}`,
    };
  }

  return res.json() as Promise<EvaluateProposalResponse>;
}
