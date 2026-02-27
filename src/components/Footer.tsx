export function Footer() {
  return (
    <footer className="site-footer">
      <div className="hrline" />
      <div className="site-footer-inner">
        <a href="mailto:info@hayatokano.com">info@hayatokano.com</a>
        <a
          href="https://instagram.com/hayatokano"
          target="_blank"
          rel="noopener noreferrer"
        >
          Instagram
        </a>
        <span>© {new Date().getFullYear()} Hayato Kano</span>
      </div>
    </footer>
  );
}
