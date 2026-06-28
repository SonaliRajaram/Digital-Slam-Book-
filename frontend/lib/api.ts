/**
 * WHY centralize API calls here instead of calling fetch() directly inside
 * every component? Two reasons:
 *   1. If your backend URL changes (e.g. moving from localhost to a deployed
 *      Render/Railway URL), you change it in ONE place.
 *   2. Every page that talks to the backend uses the exact same error
 *      handling and headers, so behavior stays consistent.
 *
 * NEXT_PUBLIC_API_URL is a Next.js environment variable. Any env var
 * prefixed with NEXT_PUBLIC_ is exposed to the browser (others stay
 * server-only, for secrets). We'll set this in a .env.local file.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Friend {
  id: number;
  name: string;
  nickname?: string;
  department?: string;
  relationship_to_owner?: string;
  year_met?: string;
  created_at: string;
  is_archived: boolean;
  pages?: Page[];
}

export interface Page {
  id: number;
  friend_id: number;
  page_number: number;
  content?: string;
  photo_url?: string;
  music_url?: string;
  updated_at?: string;
  is_archived: boolean;
}

export interface MusicTrack {
  id: number;
  title: string;
  category: string;
  url: string;
  created_at: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---------- Public (friend) calls ----------

export function createFriend(data: {
  name: string;
  nickname?: string;
  department?: string;
  relationship_to_owner?: string;
  year_met?: string;
}) {
  return request<Friend>("/friends/", { method: "POST", body: JSON.stringify(data) });
}

export function listPages(friendId: number) {
  return request<Page[]>(`/pages/friend/${friendId}`);
}

export function addPage(friendId: number) {
  return request<Page>(`/pages/friend/${friendId}`, { method: "POST" });
}

export function autosavePage(pageId: number, content: string) {
  return request<Page>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export function deletePage(pageId: number) {
  return request<{ status: string; remaining_pages: number }>(`/pages/${pageId}`, {
    method: "DELETE",
  });
}

export async function uploadPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/media/upload`, {
    method: "POST",
    body: formData,
    // NOTE: deliberately no Content-Type header here — the browser sets
    // the correct multipart boundary itself. Setting it manually is a
    // classic bug that breaks file uploads.
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || "Upload failed");
  }
  const data = await res.json();
  return data.url as string;
}

export function attachPhotoToPage(pageId: number, photoUrl: string) {
  return request<Page>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ photo_url: photoUrl }),
  });
}

export function attachMusicToPage(pageId: number, musicUrl: string) {
  return request<Page>(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ music_url: musicUrl }),
  });
}

export function listMusicCategories() {
  return request<string[]>("/music/categories");
}

export function listMusicTracks(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  return request<MusicTrack[]>(`/music/${query}`);
}

// ---------- Owner-only calls ----------

export async function ownerLogin(email: string, password: string) {
  // The backend's /auth/login expects OAuth2 form fields, not JSON,
  // because it uses FastAPI's built-in OAuth2PasswordRequestForm.
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch(`${API_URL}/auth/login`, { method: "POST", body: form });
  if (!res.ok) throw new Error("Invalid email or password");
  return res.json() as Promise<{ access_token: string; token_type: string }>;
}

export function listFriendsForOwner(token: string) {
  return request<Friend[]>("/friends/", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteFriend(token: string, friendId: number) {
  return request<{ status: string }>(`/friends/${friendId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function addMusicTrack(
  token: string,
  data: { title: string; category: string; url: string }
) {
  return request<MusicTrack>("/music/", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function deleteMusicTrack(token: string, trackId: number) {
  return request<{ status: string }>(`/music/${trackId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
