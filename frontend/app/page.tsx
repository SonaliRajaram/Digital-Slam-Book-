"use client";

/**
 * This is what loads when ANYONE opens your shared link. Per your decision,
 * there's no separate "invitation" step — a friend just fills in who they
 * are, and we immediately create their Friend record (this is what calls
 * createFriend() in lib/api.ts, which stamps created_at server-side and
 * gives us correct FCFS order automatically).
 *
 * After this form, we route them straight into /write with their new
 * friend_id, where the actual slam book page-writing experience begins.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFriend } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please tell us your name first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const friend = await createFriend({ name, nickname, department });
      // Storing friend_id locally lets them come back and keep writing
      // (e.g. if their browser closes) without re-registering as a new person.
      localStorage.setItem("slamBookFriendId", String(friend.id));
      localStorage.setItem("slamBookFriendName", friend.name);
      router.push("/write");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>You've been invited to write a page 💌</h1>
      <p className="muted">
        Just a couple of details, then you'll start writing your page in the
        slam book.
      </p>
      <form onSubmit={handleStart}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Nickname (optional)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <input
          placeholder="Department (optional)"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Starting..." : "Start Writing"}
        </button>
      </form>
    </main>
  );
}
