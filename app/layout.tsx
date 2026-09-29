import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { meta } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${meta.name} · RCBOMM`, template: `%s · RCBOMM` },
  description: `League table, head-to-heads and stats for the ${meta.name} Premier League Draft league.`,
};

// apply a stored theme before paint so there is no light/dark flash
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  const updated = new Date(meta.updated);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="logo">
              <span className="logo-mark" aria-hidden>RC</span>
              <span>RCBOMM</span>
            </Link>
            <Nav />
          </div>
        </header>
        {children}
        <footer className="footer">
          <div className="wrap">
            <span>
              Data from the Premier League Draft API · GW{meta.current_gw}
              {meta.current_gw_finished ? " final" : " in progress"} · updated{" "}
              {updated.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" })}
            </span>
            <a href="https://github.com/jonjejunum/rcbomm-fpl">Built by jonjejunum · source on GitHub</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
