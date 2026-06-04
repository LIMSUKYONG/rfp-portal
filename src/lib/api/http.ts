/**
 * fetch 응답 방어 유틸 — 클라이언트/서버 공용.
 *
 * dev 서버 콜드스타트나 라우트 미스로 빈 body / HTML 에러 페이지가 와도
 * JSON.parse("") → "Unexpected end of JSON input" 으로 터지지 않게 한다.
 */

/** 빈 body나 비(非)JSON 응답이면 null 반환 (throw 하지 않음) */
export async function readJsonSafe<T>(res: Response): Promise<T | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
