import './globals.css';

export const metadata = {
  title: 'PubQuizTerminal',
  description: 'Dein Smartphone wird zum Quiz-Terminal.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
