import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'Ultimate Tracker',
  description: 'Albion Online node & timer tracker on an interactive map',
  icons: {
    icon: '/brand/icon.png',
    shortcut: '/brand/icon.png',
    apple: '/brand/icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=gate"
        />
      </head>
      <body style={{ margin: 0, background: "#0a0a0f" }}>{children}</body>
    </html>
  );
}
