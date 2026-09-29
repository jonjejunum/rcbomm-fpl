"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Table" },
  { href: "/compare", label: "Compare" },
  { href: "/insights", label: "Insights" },
  { href: "/draft", label: "Draft & moves" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={(l.href === "/" ? path === "/" : path.startsWith(l.href)) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
      <ThemeToggle />
    </nav>
  );
}

function ThemeToggle() {
  // stateless: read the current theme at click time (the stored choice is applied pre-paint in layout)
  const toggle = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const t = dark ? "light" : "dark";
    root.dataset.theme = t;
    try { localStorage.setItem("theme", t); } catch {}
  };
  return (
    <button className="theme-btn" onClick={toggle} aria-label="Toggle light or dark theme">◐</button>
  );
}
