import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EuroChat AI | Tu asistente financiero por WhatsApp",
  description:
    "EuroChat AI te ayuda a registrar gastos, responder preguntas de consumo y anticipar tu fin de mes desde WhatsApp."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
