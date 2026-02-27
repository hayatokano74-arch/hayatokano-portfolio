export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
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
        <span className="footer-copy">© {new Date().getFullYear()} Hayato Kano</span>
      </div>
    </footer>
  );
}
