/**
 * Client-safe RFP functions — no server-only imports.
 * Safe to import from "use client" components.
 */
import type {
  RfpParsedProjectInfo,
  RfpParsedRule,
  RfpParsedDocument,
  RfpParsedLaw,
} from "@/lib/types/database";

const RFP_BUCKET = "rfp-files";

/* ── upload (browser-side) ── */

export async function uploadRfpFile(
  _supabaseUrl: string,
  _supabaseKey: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ path: string; error: string | null }> {
  // 1. Get presigned URL from server (admin client — bypasses RLS)
  const signRes = await fetch("/api/rfp/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name }),
  });

  if (!signRes.ok) {
    const body = await signRes.json().catch(() => ({ error: "presign 실패" }));
    return { path: "", error: (body as { error?: string }).error ?? "서명된 URL 생성 실패" };
  }

  const { path, signedUrl } = (await signRes.json()) as {
    path: string;
    signedUrl: string;
    token: string;
  };

  // 2. Upload directly to signed URL via XHR (progress tracking)
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ path, error: null });
      } else {
        resolve({ path: "", error: `업로드 실패 (${xhr.status}): ${xhr.responseText}` });
      }
    });
    xhr.addEventListener("error", () => {
      resolve({ path: "", error: "네트워크 오류로 업로드에 실패했습니다." });
    });
    xhr.send(file);
  });
}

/* ── parse (calls /api/rfp/parse from browser) ── */

export interface ParseRfpResponse {
  projectInfo: RfpParsedProjectInfo;
  rules: RfpParsedRule[];
  documents: RfpParsedDocument[];
  laws: RfpParsedLaw[];
  error?: string;
}

const EMPTY_RESPONSE: ParseRfpResponse = {
  projectInfo: {
    name: null, client: null, budget_amount: null, bid_deadline: null,
    project_type: null, category: null, contract_method: null,
    project_period: null, warranty_period: null,
  },
  rules: [],
  documents: [],
  laws: [],
};

export type ParseStep = "general" | "documents" | "requirements" | "conditions";

export const PARSE_STEPS: { key: ParseStep; label: string }[] = [
  { key: "general", label: "1/4 일반사항 분석 중..." },
  { key: "documents", label: "2/4 서류/서식 분석 중..." },
  { key: "requirements", label: "3/4 기능요건 분석 중..." },
  { key: "conditions", label: "4/4 제안조건 분석 중..." },
];

async function parseStep(
  filePaths: string[],
  roles: string[],
  step: ParseStep,
): Promise<Record<string, unknown>> {
  const res = await fetch("/api/rfp/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filePaths, roles, step }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`파싱 실패 (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Parse RFP in 4 sequential steps with progress callback.
 */
/**
 * Parse single RFP file (backward compatible).
 */
export async function parseRfp(
  storagePath: string,
  onStep?: (step: ParseStep, label: string) => void,
): Promise<ParseRfpResponse> {
  return parseRfpMulti([storagePath], ["bid_notice"], onStep);
}

/**
 * Parse multiple RFP files with role-based routing.
 * bid_notice → general + documents + conditions steps
 * requirements → requirements step
 */
export async function parseRfpMulti(
  filePaths: string[],
  roles: string[],
  onStep?: (step: ParseStep, label: string) => void,
): Promise<ParseRfpResponse> {
  const merged: Record<string, unknown> = {};
  const allRules: unknown[] = [];

  try {
    for (const { key, label } of PARSE_STEPS) {
      onStep?.(key, label);
      const result = await parseStep(filePaths, roles, key);

      if (result.projectInfo) merged.projectInfo = result.projectInfo;
      if (result.documents) merged.documents = result.documents;
      if (result.laws) merged.laws = result.laws;
      if (Array.isArray(result.rules)) allRules.push(...(result.rules as unknown[]));
    }
  } catch (err) {
    return { ...EMPTY_RESPONSE, error: err instanceof Error ? err.message : "파싱 실패" };
  }

  return {
    projectInfo: (merged.projectInfo as ParseRfpResponse["projectInfo"]) ?? EMPTY_RESPONSE.projectInfo,
    rules: allRules as RfpParsedRule[],
    documents: (merged.documents as RfpParsedDocument[]) ?? [],
    laws: (merged.laws as RfpParsedLaw[]) ?? [],
  };
}
