import type { ScopeOptions, SourceDetail, UploadResult, VerificationApi } from "./types";

/**
 * FastAPI adapter. Responses are expected to match the domain types in
 * `@/lib/types/domain` (the Pydantic models mirror them), so no UI changes are
 * needed when switching NEXT_PUBLIC_API_MODE from "mock" to "http".
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new ApiError(response.status, `${init?.method ?? "GET"} ${path} failed with ${response.status}`);
  return (await response.json()) as T;
}

async function requestOrNull<T>(path: string): Promise<T | null> {
  try {
    return await request<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

const scopeQuery = (scope: ScopeOptions) => `include_demo=${scope.includeDemo}`;

export const httpApi: VerificationApi = {
  getDashboard: (scope) => request(`/dashboard?${scopeQuery(scope)}`),
  getReports: (scope) => request(`/reports?${scopeQuery(scope)}`),
  getReport: (id, scope) => requestOrNull(`/reports/${encodeURIComponent(id)}?${scopeQuery(scope)}`),
  getClaims: (id, scope) => request(`/reports/${encodeURIComponent(id)}/claims?${scopeQuery(scope)}`),
  getClaim: (id, index, scope) => requestOrNull(`/reports/${encodeURIComponent(id)}/claims/${index}?${scopeQuery(scope)}`),
  getCitations: (id, scope) => request(`/reports/${encodeURIComponent(id)}/citations?${scopeQuery(scope)}`),
  getSources: (scope) => request(`/sources?${scopeQuery(scope)}`),
  getSource: (id, scope) => requestOrNull<SourceDetail>(`/sources/${encodeURIComponent(id)}?${scopeQuery(scope)}`),
  getActivity: (scope) => request(`/activity?${scopeQuery(scope)}`),
  getSearchIndex: (scope) => request(`/search-index?${scopeQuery(scope)}`),

  uploadDocument(file, onProgress) {
    // XMLHttpRequest is used because fetch does not report upload progress.
    return new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${BASE_URL}/documents`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText) as UploadResult) : reject(new ApiError(xhr.status, "Upload failed"));
      xhr.onerror = () => reject(new ApiError(0, "Upload failed"));
      const body = new FormData();
      body.append("file", file);
      xhr.send(body);
    });
  },

  startVerification: (input) => request(`/verifications`, { method: "POST", body: JSON.stringify(input) }),
  getVerification: (jobId) => requestOrNull(`/verifications/${encodeURIComponent(jobId)}`),
  async cancelVerification(jobId) {
    await request(`/verifications/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
  },
};
