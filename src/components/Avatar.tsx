import { useState } from "react";

/** Muted, brand-friendly backgrounds picked deterministically per user. */
const TONES = [
  "bg-[#C93A1B] text-[#F7F3EA]", // vermilion
  "bg-[#1C1915] text-[#F7F3EA]", // ink
  "bg-[#8A5A2B] text-[#F7F3EA]", // bronze
  "bg-[#3E5C3A] text-[#F7F3EA]", // moss
  "bg-[#4A5A6A] text-[#F7F3EA]", // slate
  "bg-[#7A3B4F] text-[#F7F3EA]", // plum
];

function toneFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

function initialsOf(name: string | null, email: string): string {
  const src = (name || "").trim();
  if (src) {
    const parts = src.split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return (email.trim().charAt(0) || "?").toUpperCase();
}

export function Avatar({
  name,
  email,
  photoURL,
  size = 44,
  className = "",
}: {
  name: string | null;
  email: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
}) {
  const [imgOk, setImgOk] = useState(true);
  const showPhoto = !!photoURL && imgOk;
  const label = `Account: ${email}`;

  return (
    <span
      aria-label={label}
      role="img"
      className={`inline-flex items-center justify-center overflow-hidden rounded-full font-display font-semibold ${toneFor(email)} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {showPhoto ? (
        <img
          src={photoURL as string}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setImgOk(false)}
          className="h-full w-full object-cover"
        />
      ) : (
        initialsOf(name, email)
      )}
    </span>
  );
}
