/**
 * Client-safe document functions — no server-only imports.
 */

const DOC_BUCKET = "document-files";
const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20MB

export async function uploadDocumentFile(
  supabaseUrl: string,
  supabaseKey: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ path: string; error: string | null }> {
  if (file.size > MAX_DOC_SIZE) {
    return { path: "", error: "파일 크기가 20MB를 초과합니다." };
  }

  const path = `${crypto.randomUUID()}/${file.name}`;

  const signRes = await fetch(
    `${supabaseUrl}/storage/v1/object/upload/sign/${DOC_BUCKET}/${path}`,
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
      `${supabaseUrl}/storage/v1/object/upload/${DOC_BUCKET}/${path}?token=${token}`,
    );
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

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

export interface ValidateDocResponse {
  validation_status: string;
  validation_message: string | null;
  calculated_score: number | null;
  ai_issue_date: string | null;
  ai_expiry_date: string | null;
  error?: string;
}

export async function validateDocument(
  docId: string,
  storagePath: string,
  fileSizeMb: number,
): Promise<ValidateDocResponse> {
  const res = await fetch("/api/documents/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docId, storagePath, fileSizeMb }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      validation_status: "error",
      validation_message: `검증 실패: ${text}`,
      calculated_score: null,
      ai_issue_date: null,
      ai_expiry_date: null,
      error: text,
    };
  }

  return res.json() as Promise<ValidateDocResponse>;
}
