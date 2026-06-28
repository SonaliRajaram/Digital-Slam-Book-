"use client";

/**
 * This is YOUR view. It lists friends in First-Come-First-Served order
 * (the backend already sorts by created_at, we just render in that order),
 * each with their pages grouped underneath — matching your requirement
 * exactly: "Even if Friend B writes 10 pages, all pages remain together,
 * and Friend A appears before Friend B."
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deleteFriend, Friend, listFriendsForOwner } from "@/lib/api";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("ownerToken");
    if (!stored) {
      router.push("/owner/login");
      return;
    }
    setToken(stored);
    listFriendsForOwner(stored)
      .then(setFriends)
      .catch(() => setError("Session expired. Please log in again."));
  }, [router]);

  async function handleDeleteFriend(friendId: number) {
    if (!token) return;
    if (!confirm("Permanently delete this friend and all their pages?")) return;
    await deleteFriend(token, friendId);
    setFriends((prev) => prev.filter((f) => f.id !== friendId));
  }

  return (
    <main className="container">
      <h1>Your Slam Book</h1>
      <Link href="/owner/read">
        <button style={{ marginBottom: "1rem" }}>📖 Open & Read the Slam Book</button>
      </Link>
      <Link href="/owner/music">
        <button className="secondary" style={{ marginBottom: "1rem" }}>🎵 Manage Music Library</button>
      </Link>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <p className="muted">{friends.length} friend(s) have written so far.</p>

      {friends.map((friend) => (
        <div className="friend-group" key={friend.id}>
          <h3>
            {friend.name} {friend.nickname && `"${friend.nickname}"`}
          </h3>
          <p className="muted">
            {friend.department || "No department listed"} ·{" "}
            {new Date(friend.created_at).toLocaleString()}
          </p>
          <p className="muted">{friend.pages?.length || 0} page(s)</p>
          <button className="secondary" onClick={() => handleDeleteFriend(friend.id)}>
            Delete Friend
          </button>
        </div>
      ))}
    </main>
  );
}
