import { encode } from "uqr";

/**
 * The ticket's signed token as a QR, drawn as one SVG path (dark modules on bone, with the
 * standard four-module quiet zone so phone cameras and door scanners read it).
 */
export function TicketQr({ value, label }: { readonly value: string; readonly label: string }) {
  const qr = encode(value, { ecc: "M", border: 4 });
  let path = "";
  qr.data.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x} ${y}h1v1h-1z`;
    }),
  );
  return (
    <svg
      viewBox={`0 0 ${qr.size} ${qr.size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="aspect-square w-full max-w-64 rounded-sm bg-bone"
    >
      <path d={path} fill="#121212" />
    </svg>
  );
}
