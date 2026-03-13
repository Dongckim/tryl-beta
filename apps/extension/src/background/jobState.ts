import type { CreateTryOnJobResponse, ResolveProductResponse } from "./api";

export interface TabJobState {
  jobId: number;
  status: string;
  productId: number;
  resolvedProduct?: ResolveProductResponse;
  createdAt: string;
}

/** Current try-on job per tab (tabId -> state). Cleared when tab closes. */
const jobByTab = new Map<number, TabJobState>();

export function setJobForTab(
  tabId: number,
  job: CreateTryOnJobResponse,
  productId: number,
  resolvedProduct?: ResolveProductResponse
): void {
  const jobId = job.jobId ?? job.job_id;
  if (typeof jobId !== "number") return;
  jobByTab.set(tabId, {
    jobId,
    status: job.status,
    productId,
    resolvedProduct,
    createdAt: new Date().toISOString(),
  });
}

export function getJobForTab(tabId: number): TabJobState | undefined {
  return jobByTab.get(tabId);
}

export function clearJobForTab(tabId: number): void {
  jobByTab.delete(tabId);
}

/** Job state for the active tab. Used by sidepanel via GET_JOB_STATE message. */
export async function getJobForActiveTab(): Promise<{ tabId: number; state: TabJobState } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  const state = getJobForTab(tab.id);
  return state ? { tabId: tab.id, state } : null;
}
