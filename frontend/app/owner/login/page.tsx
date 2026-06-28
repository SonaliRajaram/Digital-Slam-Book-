"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ownerLogin } from "@/lib/api";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { access_token } = await ownerLogin(email, password);
      // Stored in localStorage for this scaffold pass. In the security
      // hardening milestone we'll discuss upgrading this to an HttpOnly
      // cookie, which JavaScript can't read — a stronger defense against
      // XSS attacks stealing the token.
      localStorage.setItem("ownerToken", access_token);
      router.push("/owner/dashboard");
    } catch {
      setError("Incorrect email or password.");
    }
  }

  return (
    <main className="container">
      <h1>Owner Login</h1>
      <form onSubmit={handleLogin}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button type="submit">Log In</button>
      </form>
    </main>
  );
}
