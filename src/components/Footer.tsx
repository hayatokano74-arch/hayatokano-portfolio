import type React from "react";

export function Footer({ topSlot }: { topSlot?: React.ReactNode } = {}) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {topSlot}
        <a href="mailto:info@hayatokano.com" className="footer-link">
          info@hayatokano.com
        </a>
        <a
          href="https://www.instagram.com/_hayatokano/"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Instagram
        </a>
        <a
          href="https://x.com/_oshica"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          X
        </a>
        <span className="footer-copy">© {new Date().getFullYear()} Hayato Kano</span>
      </div>
    </footer>
  );
}
