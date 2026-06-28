/**
 * Turns the owner's friend list (each with nested pages) into one FLAT,
 * linear sequence of "spreads" for the reading experience.
 *
 * WHY flatten instead of nesting two loops in the component?
 * The reading view just needs "what comes after this page" / "what comes
 * before" as simple array indexing — it shouldn't have to know or care
 * that pages are grouped by friend. We do that grouping logic ONCE here,
 * keeping the component itself dumb and easy to reason about.
 */

import { Friend } from "./api";

export interface Spread {
  friendName: string;
  friendDepartment?: string;
  pageNumber: number;
  totalPagesForFriend: number;
  content?: string;
  photoUrl?: string;
  musicUrl?: string;
}

export function buildReadingSequence(friends: Friend[]): Spread[] {
  const sequence: Spread[] = [];
  for (const friend of friends) {
    const pages = friend.pages || [];
    for (const page of pages) {
      sequence.push({
        friendName: friend.name,
        friendDepartment: friend.department,
        pageNumber: page.page_number,
        totalPagesForFriend: pages.length,
        content: page.content,
        photoUrl: page.photo_url,
        musicUrl: page.music_url,
      });
    }
  }
  return sequence;
}
