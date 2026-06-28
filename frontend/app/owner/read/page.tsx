"use client";

/**
 * This is the "opening a real book" experience your spec asked for.
 *
 * CONCEPT: Why Framer Motion's AnimatePresence for the page turn?
 * Normally in React, when you change state, the old content just
 * disappears and the new content appears instantly — no transition.
 * AnimatePresence keeps the OUTGOING element mounted just long enough to
 * animate it OUT (rotate/fade), while the incoming one animates IN. The
 * `mode="wait"` setting ensures they don't overlap, which is what gives
 * the "one page turning before the next appears" feeling rather than a
 * jarring cross-fade.
 *
 * CONCEPT: Why keyboard + click + swipe?
 * Your spec explicitly asked for all three. We attach a keydown listener
 * for arrow keys, plain onClick handlers for buttons, and touch handlers
 * for swipe — three input methods, one shared `goNext`/`goPrev` function,
 * so behavior stays consistent no matter how someone navigates.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { listFriendsForOwner } from "@/lib/api";
import { buildReadingSequence, Spread } from "@/lib/readingFlow";

const HEART_COUNT = 8;

type Stage = "cover" | "opening" | "reading";

/**
 * CONCEPT: Why YouTube needs different handling than a direct audio file.
 * The HTML <audio> tag can only play a URL that points DIRECTLY to an
 * audio file (.mp3, .wav, etc.) — it has no idea what to do with a
 * YouTube page URL, because that URL points to a whole webpage, not a
 * sound file. YouTube doesn't give out direct audio file links (and
 * extracting one yourself violates their Terms of Service). The correct,
 * permitted way to play a YouTube link is to embed YouTube's own player
 * in an <iframe> and let YOUTUBE handle the audio — we're not playing
 * the file ourselves, we're showing their player and letting it play.
 */
function getYouTubeEmbedId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function ReadPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("cover");
  const [sequence, setSequence] = useState<Spread[]>([]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [musicStarted, setMusicStarted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("ownerToken");
    if (!token) {
      router.push("/owner/login");
      return;
    }
    listFriendsForOwner(token).then((friends) => {
      setSequence(buildReadingSequence(friends));
    });
  }, [router]);

  const current = sequence[index];
  const youtubeId = current?.musicUrl ? getYouTubeEmbedId(current.musicUrl) : null;

  // Reset the "has the friend/owner actually started this page's music"
  // flag every time we land on a new page -- each page's music starts
  // fresh, never carries over a "already played" state from a prior page.
  useEffect(() => {
    setMusicStarted(false);
  }, [index]);

  // Music plays only while reading THIS page, and stops/changes the
  // moment we move to a page with a different (or no) track — matching
  // your spec: "Music starts only while reading that friend's pages."
  //
  // NOTE: this effect only handles DIRECT audio file URLs. YouTube links
  // are rendered as an <iframe> further down instead (see getYouTubeEmbedId
  // above) -- an <audio> tag cannot play a YouTube page URL at all.
  useEffect(() => {
    if (!audioRef.current) return;
    if (current?.musicUrl && !youtubeId) {
      audioRef.current.src = current.musicUrl;
      audioRef.current
        .play()
        .then(() => setMusicStarted(true))
        .catch(() => {
          // Browsers commonly block autoplay until the user has clicked
          // SOMETHING on the page first. We don't swallow this silently
          // anymore -- musicStarted stays false, which shows the visible
          // "▶ Play Music" button below as a guaranteed-to-work fallback.
          setMusicStarted(false);
        });
    } else {
      audioRef.current.pause();
    }
  }, [current?.musicUrl, youtubeId]);

  function handleManualPlay() {
    if (youtubeId) {
      // For YouTube, simply rendering/re-rendering the iframe with
      // autoplay=1 (done in the JSX below, gated on musicStarted) is
      // enough once triggered by this click -- a real user gesture.
      setMusicStarted(true);
      return;
    }
    audioRef.current?.play().then(() => setMusicStarted(true)).catch(() => {});
  }

  function goNext() {
    if (index < sequence.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
    }
  }

  function goPrev() {
    if (index > 0) {
      setDirection(-1);
      setIndex((i) => i - 1);
    }
  }

  function handleOpenBook() {
    // CONCEPT: why a separate "opening" stage instead of jumping straight
    // from cover to reading? Your spec asked for a distinct "Book Opening
    // Animation" as its own beat, not just the cover instantly vanishing.
    // We hold this intermediate stage for exactly as long as the CSS/Framer
    // transition needs (600ms here), then land on the first page.
    setStage("opening");
    setTimeout(() => setStage("reading"), 650);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, sequence.length]);

  // Basic swipe support
  const touchStartX = useRef(0);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff < -50) goNext();
    if (diff > 50) goPrev();
  }

  // Generate ambient floating hearts once, with randomized timing so they
  // don't all move in lockstep (which would look mechanical, not organic).
  const hearts = useMemo(
    () =>
      Array.from({ length: HEART_COUNT }).map((_, i) => ({
        left: `${(i * 97) % 100}%`,
        duration: 14 + (i % 5) * 3,
        delay: i * 1.3,
      })),
    []
  );

  const pageVariants = {
    enter: (dir: number) => ({ rotateY: dir > 0 ? 90 : -90, opacity: 0 }),
    center: { rotateY: 0, opacity: 1 },
    exit: (dir: number) => ({ rotateY: dir > 0 ? -90 : 90, opacity: 0 }),
  };

  if (stage === "cover" || stage === "opening") {
    return (
      <main className="book-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key="cover"
            className="cover-stage"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={
              stage === "opening"
                ? { rotateY: -110, opacity: 0, scale: 0.9 }
                : { opacity: 1, scale: 1, rotateY: 0 }
            }
            transition={{ duration: stage === "opening" ? 0.6 : 0.4, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d", transformOrigin: "left center" }}
          >
            {/* This is YOUR uploaded Canva design, served from
                frontend/public/cover.png -> available at /cover.png.
                Replace that file anytime to update the cover; no code
                change needed. */}
            <img src="/cover.png" alt="Slam Book Cover" className="cover-image" />
            {stage === "cover" && (
              <button className="open-book-btn" onClick={handleOpenBook}>
                Open Book
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    );
  }

  if (sequence.length === 0) {
    return (
      <main className="book-stage">
        <p style={{ color: "#e9d9b8" }}>No pages written yet.</p>
      </main>
    );
  }

  return (
    <main
      className="book-stage"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {hearts.map((h, i) => (
        <span
          key={i}
          className="ambient-particle"
          style={{
            left: h.left,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
          }}
        >
          ♥
        </span>
      ))}

      <audio ref={audioRef} loop />

      {youtubeId && musicStarted && (
        <iframe
          key={youtubeId}
          width="1"
          height="1"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}`}
          allow="autoplay"
          title="Background music"
        />
      )}

      {current?.musicUrl && !musicStarted && (
        <button
          onClick={handleManualPlay}
          style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 5 }}
        >
          ▶ Play Music
        </button>
      )}

      <div style={{ perspective: 1600 }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            className="book-spread"
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="ribbon" />
            <h2 className="friend-heading">{current.friendName}</h2>
            <p className="friend-meta">
              {current.friendDepartment || ""} · Page {current.pageNumber} of{" "}
              {current.totalPagesForFriend}
            </p>
            {current.photoUrl && (
              <img src={current.photoUrl} alt="" className="page-photo" />
            )}
            <p className="handwritten-content">
              {current.content || "(this page was left blank)"}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="book-controls">
        <button onClick={goPrev} disabled={index === 0}>
          ← Previous
        </button>
        <span className="page-indicator">
          {index + 1} / {sequence.length}
        </span>
        <button onClick={goNext} disabled={index === sequence.length - 1}>
          Next →
        </button>
      </div>
    </main>
  );
}