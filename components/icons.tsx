import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { name: "arrow" | "plus" | "close" | "copy" | "check" | "plate" | "elixir" };

export function Icon({ name, ...props }: Props) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {name === "arrow" && <><path d="M4 12h15M13 6l6 6-6 6" /></>}
    {name === "plus" && <path d="M12 5v14M5 12h14" />}
    {name === "close" && <path d="m6 6 12 12M6 18 18 6" />}
    {name === "copy" && <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M15 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4" /></>}
    {name === "check" && <path d="m5 12 4 4L19 6" />}
    {name === "plate" && <><circle cx="12" cy="12" r="5" /><path d="M3 3v6m3-6v6M3 6h3M4.5 9v12M21 3c-3 3-3 8 0 9v9M21 3v9" /></>}
    {name === "elixir" && <>
      <path d="M9 3h6M10 3v5l-4.4 4.9a4.8 4.8 0 0 0 3.6 8.1h5.6a4.8 4.8 0 0 0 3.6-8.1L14 8V3" />
      <path d="M5.2 15c2.4-1.3 4.7-1.3 6.8 0s4.4 1.3 6.8 0M10 18h.01m4.99-1h.01" />
    </>}
  </svg>;
}
