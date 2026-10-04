import { mockApi } from "@/lib/mock/adapter";
import { httpApi } from "./http";
import type { VerificationApi } from "./types";

/**
 * The only entry point components use for data. Set NEXT_PUBLIC_API_MODE=http
 * (and NEXT_PUBLIC_API_BASE_URL) to switch from demo fixtures to FastAPI.
 */
export const api: VerificationApi = process.env.NEXT_PUBLIC_API_MODE === "http" ? httpApi : mockApi;

export const {
  getDashboard,
  getReports,
  getReport,
  getClaims,
  getClaim,
  getCitations,
  getSources,
  getSource,
  getActivity,
  getSearchIndex,
  uploadDocument,
  startVerification,
  getVerification,
  cancelVerification,
} = api;

/** Alias matching the job-polling name used in the implementation brief. */
export const getVerificationProgress = getVerification;

export type { ScopeOptions, SourceDetail, UploadResult, VerificationApi } from "./types";
