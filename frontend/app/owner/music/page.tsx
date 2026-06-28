"use client";

/**
 * Lets you (the owner) build the music library friends can choose from.
 * "Adding" a track here just means: title + category + a URL (either a
 * link you paste from somewhere, or a file you upload via the same photo
 * upload pipeline — audio files work through /media/upload too, since
 * that endpoint just validates type and stores the file; we restrict it
 * to images at the validation layer, so for now URL-pasting is the
 * supported path here. Uploading raw audio files is a small follow-up if
 * you want it — flag it and we'll add it).
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMusicTrack,
  deleteMusicTrack,
  listMusicTracks,
  MusicTrack,
} from "@/lib/api";

const SUGGESTED_CATEGORIES = [
  "Romantic", "Friendship", "Funny", "Emotional",
  "College", "Retro", "Instrumental", "K-Pop", "Anime", "Devotional",
];

export default function OwnerMusicPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(SUGGESTED_CATEGORIES[0]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("ownerToken");
    if (!stored) {
      router.push("/owner/login");
      return;
    }
    setToken(stored);
    listMusicTracks().then(setTracks);
  }, [router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !title.trim() || !url.trim()) {
      setError("Title and URL/link are both required.");
      return;
    }
    setError("");
    try {
      const track = await addMusicTrack(token, { title, category, url });
      setTracks((prev) => [...prev, track]);
      setTitle("");
      setUrl("");
    } catch {
      setError("Could not add track. Check your link and try again.");
    }
  }

  async function handleDelete(trackId: number) {
    if (!token) return;
    await deleteMusicTrack(token, trackId);
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }

  const grouped = tracks.reduce<Record<string, MusicTrack[]>>((acc, t) => {
    acc[t.category] = acc[t.category] || [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <main className="container">
      <h1>Music Library</h1>
      <p className="muted">
        Add songs here, organized by category. Friends will be able to pick
        from this library while writing their page, or paste their own link.
      </p>

      <form onSubmit={handleAdd} className="page-card">
        <input
          placeholder="Song title (e.g. Tum Hi Ho)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: "100%", padding: "0.65rem", marginBottom: "0.75rem", borderRadius: 8, border: "1px solid #cbb89a" }}
        >
          {SUGGESTED_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          placeholder="Audio URL (direct .mp3 link, or YouTube link)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit">+ Add to Library</button>
      </form>

      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat} className="friend-group">
          <h3>{cat}</h3>
          {list.map((t) => (
            <div key={t.id} style={{ marginBottom: "0.5rem" }}>
              <span>{t.title}</span>{" "}
              <button className="secondary" onClick={() => handleDelete(t.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      ))}

      {tracks.length === 0 && <p className="muted">No tracks added yet.</p>}
    </main>
  );
}
