const STORAGE_KEY = "tryl_session";

export interface SessionUser {
  id: string;
  email: string;
}

export interface Session {
  accessToken: string;
  user: SessionUser;
}

export async function getSession(): Promise<Session | null> {
  const out = await chrome.storage.local.get(STORAGE_KEY);
  const raw = out[STORAGE_KEY];
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Session;
  if (!s.accessToken || !s.user?.id || !s.user?.email) return null;
  return s;
}

export async function setSession(session: Session): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: session });
}

export async function clearSession(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}
