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

export async function parseRfp(storagePath: string): Promise<ParseRfpResponse> {
  const res = await fetch("/api/rfp/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storagePath }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ...EMPTY_RESPONSE, error: `파싱 실패 (${res.status}): ${text}` };
  }

  const data = await res.json();
  return {
    projectInfo: data.projectInfo ?? EMPTY_RESPONSE.projectInfo,
    rules: data.rules ?? [],
    documents: data.documents ?? [],
    laws: data.laws ?? [],
    error: data.error,
  };
}
