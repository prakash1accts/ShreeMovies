"use client";

import { useState } from "react";

export default function PosterImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-neutral-800 text-center text-xs text-neutral-600 ${className ?? ""}`}
      >
        {src ? "Poster image unavailable" : "No poster"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className={className}
    />
  );
}
