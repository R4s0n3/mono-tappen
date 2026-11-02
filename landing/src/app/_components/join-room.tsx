"use client";

import { useState } from "react";

export function JoinRoom() {
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    window.location.href = `https://play.tappen.app/join?code=${encodeURIComponent(trimmed.toUpperCase())}`;
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col items-center gap-3"
    >
      <span className="text-xs uppercase tracking-widest text-tappen-blue-300">
        already at a table?
      </span>
      <div className="flex overflow-hidden rounded-full bg-tappen-blue-900/60 ring-1 ring-tappen-blue-800 focus-within:ring-tappen-sunset-400">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="join code"
          maxLength={8}
          autoCapitalize="characters"
          className="w-40 bg-transparent px-5 py-3 text-center font-bold uppercase tracking-[0.2em] text-tappen-blue-50 placeholder:text-tappen-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!code.trim()}
          className="bg-tappen-sunset-500 px-6 text-sm font-bold text-tappen-blue-900 transition hover:bg-tappen-sunset-400 disabled:opacity-40"
        >
          Join
        </button>
      </div>
    </form>
  );
}
