"use client";

/**
 * Imagem de produto com fallback de marca. Usa <img> (e não next/image)
 * porque as imagens podem ser URLs arbitrárias ou data URLs cadastradas
 * no painel admin.
 */
export function SmartImage({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={alt}
      role="img"
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{
        background:
          "linear-gradient(135deg, var(--color-copper) 0%, #b9632f 100%)",
      }}
    >
      <CubeMark className="h-1/2 w-1/2 opacity-90" />
    </div>
  );
}

/** Símbolo "cubo A·S·3" simplificado, em contorno, para placeholders. */
export function CubeMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 110"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M50 4 L92 28 V82 L50 106 L8 82 V28 Z"
        stroke="var(--color-ice)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M8 28 L50 52 L92 28 M50 52 V106"
        stroke="var(--color-ice)"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
