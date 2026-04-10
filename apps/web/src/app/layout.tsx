import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | TripSync",
    default: "TripSync — Planeje viagens colaborativas",
  },
  description:
    "Planeje, organize e compartilhe roteiros de viagem com seus amigos em tempo real.",
  keywords: ["viagem", "planejamento", "roteiro", "colaborativo", "tripsync"],
  authors: [{ name: "TripSync" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "TripSync",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
