"use client";

/**
 * This is the core writing experience. For this functional pass it's plain
 * (no 3D page-turn yet) — we're proving the MECHANICS first: page
 * navigation, add/delete, and autosave. Animation gets layered on top of
 * this exact logic in a later milestone, not bolted on separately.
 *
 * CONCEPT: Debounced autosave
 * If we saved on every single keystroke, we'd hammer the backend with a
 * request per letter typed. Instead we wait until the friend STOPS typing
 * for ~1.5 seconds, then save once. This is called "debouncing" — a
 * standard technique for any input that triggers expensive work.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addPage,
  attachMusicToPage,
  attachPhotoToPage,
  autosavePage,
  deletePage,
  listMusicCategories,
  listMusicTracks,
  listPages,
  MusicTrack,
  Page,
  uploadPhoto,
} from "@/lib/api";

export default function WritePage() {
  const router = useRouter();
  const [stage, setStage] = useState<"cover" | "writing" | "finished">("cover");
  const [friendId, setFriendId] = useState<number | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On load, recover which friend this browser belongs to.
  useEffect(() => {
    const stored = localStorage.getItem("slamBookFriendId");
    if (!stored) {
      router.push("/"); // nobody registered yet -> send them to the entry form
      return;
    }
    const id = Number(stored);
    setFriendId(id);
    listPages(id).then(setPages);
  }, [router]);

  const currentPage = pages[currentIndex];

  function handleContentChange(value: string) {
    setPages((prev) => {
      const copy = [...prev];
      copy[currentIndex] = { ...copy[currentIndex], content: value };
      return copy;
    });

    setSaveStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!currentPage) return;
      setSaveStatus("saving");
      await autosavePage(currentPage.id, value);
      setSaveStatus("saved");
    }, 1500);
  }

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentPage) return;

    setPhotoUploading(true);
    setPhotoError("");
    try {
      // Two steps, matching the backend design: (1) upload the raw file
      // and get a URL back, (2) save that URL onto the current page.
      // These are deliberately separate requests/concerns, not one
      // combined endpoint — see media_router.py's docstring for why.
      const url = await uploadPhoto(file);
      const updated = await attachPhotoToPage(currentPage.id, url);
      setPages((prev) => {
        const copy = [...prev];
        copy[currentIndex] = updated;
        return copy;
      });
    } catch (err: any) {
      setPhotoError(err.message || "Could not upload photo.");
    } finally {
      setPhotoUploading(false);
    }
  }

  // ---------- Music picker ----------
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [tracksInCategory, setTracksInCategory] = useState<MusicTrack[]>([]);
  const [customMusicUrl, setCustomMusicUrl] = useState("");
  const [musicError, setMusicError] = useState("");

  useEffect(() => {
    listMusicCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) setSelectedCategory(cats[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedCategory) return;
    listMusicTracks(selectedCategory).then(setTracksInCategory);
  }, [selectedCategory]);

  async function handlePickTrack(track: MusicTrack) {
    if (!currentPage) return;
    setMusicError("");
    try {
      const updated = await attachMusicToPage(currentPage.id, track.url);
      setPages((prev) => {
        const copy = [...prev];
        copy[currentIndex] = updated;
        return copy;
      });
    } catch {
      setMusicError("Could not attach this track. Try again.");
    }
  }

  async function handleCustomMusicSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPage || !customMusicUrl.trim()) return;
    setMusicError("");
    try {
      const updated = await attachMusicToPage(currentPage.id, customMusicUrl.trim());
      setPages((prev) => {
        const copy = [...prev];
        copy[currentIndex] = updated;
        return copy;
      });
      setCustomMusicUrl("");
    } catch {
      setMusicError("Could not attach this link. Try again.");
    }
  }

  function goPrev() {
    if (currentIndex === 0) {
      // At their very first page, "Previous" takes the friend back to the
      // cover page rather than being disabled — matching your requirement.
      setStage("cover");
    } else {
      setCurrentIndex((i) => i - 1);
    }
  }

  function goNext() {
    if (currentIndex < pages.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleFinish() {
    setStage("finished");
  }

  async function handleAddPage() {
    if (!friendId) return;
    const newPage = await addPage(friendId);
    setPages((prev) => [...prev, newPage]);
    setCurrentIndex(pages.length); // jump to the new page
  }

  async function handleDeletePage() {
    if (!currentPage) return;
    if (pages.length === 1) {
      alert("You need at least one page — write something first!");
      return;
    }
    await deletePage(currentPage.id);
    const refreshed = await listPages(friendId!);
    setPages(refreshed);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  }

  if (!friendId || pages.length === 0) {
    return (
      <main className="container">
        <p>Loading your page...</p>
      </main>
    );
  }

  if (stage === "cover") {
    return (
      <main className="book-stage">
        <div className="cover-stage">
          {/* Same cover.png the owner sees -- every friend who opens the
              link sees this exact cover first, then proceeds into their
              own page(s). Clicking "Previous" on page 1 brings them back
              here, so the cover acts as the natural starting boundary. */}
          <img src="/cover.png" alt="Slam Book Cover" className="cover-image" />
          <button className="open-book-btn" onClick={() => setStage("writing")}>
            Open & Start Writing
          </button>
        </div>
      </main>
    );
  }

  if (stage === "finished") {
    return (
      <main className="book-stage">
        <div className="cover-stage" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "#f6ecd9", padding: "2rem", textAlign: "center" }}>
          <h2 className="friend-heading">Thank you 💛</h2>
          <p className="handwritten-content" style={{ fontSize: "1.3rem" }}>
            Your memory has been added to the slam book forever.
          </p>
          <button className="secondary" onClick={() => setStage("writing")}>
            Keep Writing
          </button>
          <p className="muted" style={{ marginTop: "1rem" }}>
            You can safely close this tab now.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <h2>Page {currentIndex + 1} of {pages.length}</h2>
      <div className="page-card">
        <textarea
          rows={10}
          placeholder="Write your memory here..."
          value={currentPage?.content || ""}
          onChange={(e) => handleContentChange(e.target.value)}
        />
        {currentPage?.photo_url && (
          <img
            src={currentPage.photo_url}
            alt="Attached memory"
            style={{ maxWidth: "100%", borderRadius: "8px", marginBottom: "0.75rem" }}
          />
        )}
        <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={photoUploading} />
        {photoUploading && <p className="muted">Uploading photo...</p>}
        {photoError && <p style={{ color: "crimson" }}>{photoError}</p>}

        <hr style={{ margin: "1rem 0", border: "none", borderTop: "1px solid #e3d3b4" }} />

        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>🎵 Add a song to this page</p>
        {currentPage?.music_url && (
          <p className="muted">Currently attached: {currentPage.music_url}</p>
        )}

        {categories.length > 0 && (
          <>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: "100%", padding: "0.6rem", marginBottom: "0.5rem", borderRadius: 8, border: "1px solid #cbb89a" }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {tracksInCategory.map((t) => (
              <button key={t.id} className="secondary" onClick={() => handlePickTrack(t)}>
                ▶ {t.title}
              </button>
            ))}
          </>
        )}
        {categories.length === 0 && (
          <p className="muted">The owner hasn't added any songs to the library yet.</p>
        )}

        <form onSubmit={handleCustomMusicSubmit} style={{ marginTop: "0.5rem" }}>
          <input
            placeholder="Or paste your own song link (YouTube, etc.)"
            value={customMusicUrl}
            onChange={(e) => setCustomMusicUrl(e.target.value)}
          />
          <button type="submit" className="secondary">Use This Link</button>
        </form>
        {musicError && <p style={{ color: "crimson" }}>{musicError}</p>}

        <p className="muted">
          {saveStatus === "saving" && "Saving..."}
          {saveStatus === "saved" && "All changes saved ✓"}
        </p>
      </div>

      <div>
        <button className="secondary" onClick={goPrev}>
          ← Previous
        </button>
        <button
          className="secondary"
          disabled={currentIndex === pages.length - 1}
          onClick={goNext}
        >
          Next →
        </button>
        <button onClick={handleAddPage}>+ Add New Page</button>
        <button className="secondary" onClick={handleDeletePage}>
          Delete This Page
        </button>
        <button onClick={handleFinish}>Finish Writing ✓</button>
      </div>

      <p className="muted" style={{ marginTop: "1.5rem" }}>
        You can close this tab anytime — everything is saved automatically.
        Come back using the same link to keep writing.
      </p>
    </main>
  );
}
