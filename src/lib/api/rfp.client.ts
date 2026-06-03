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
  supabaseUrl: string,
  supabaseKey: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ path: string; error: string | null }> {
  const path = `${crypto.randomUUID()}/${file.name}`;

  const signRes = await fetch(
    `${supabaseUrl}/storage/v1/object/upload/sign/${RFP_BUCKET}/${path}`,
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
      `${supabaseUrl}/storage/v1/object/upload/${RFP_BUCKET}/${path}?token=${token}`,
    );
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
