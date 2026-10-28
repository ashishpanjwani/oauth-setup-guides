/** Letter mark tinted with a colour derived from the app name, so each app looks distinct. */
export function AppMark({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
  const box = size === "lg" ? "h-14 w-14 rounded-2xl text-3xl" : "h-11 w-11 rounded-xl text-xl";
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center border font-display ${box}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 85% 62% / 0.32), hsl(${(hue + 50) % 360} 85% 55% / 0.08))`,
        borderColor: `hsl(${hue} 70% 60% / 0.35)`,
        color: `hsl(${hue} 90% 85%)`,
      }}
    >
      {name.charAt(0)}
    </span>
  );
}
