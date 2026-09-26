import "./globals.css";

export const metadata = {
  title: "Tarjetas de lealtad",
  description: "Tarjetas de lealtad digitales para Apple Wallet y Google Wallet",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
