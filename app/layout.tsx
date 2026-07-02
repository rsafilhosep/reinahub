import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReinaHub - Vault Tools",
  description: "Hub de ferramentas Tibia/OTServer migrado do prototipo Vault of Thais."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
