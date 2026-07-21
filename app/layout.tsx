import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoomScan | Electricity, made visible",
  description: "Estimate a room's electricity use and monthly bill."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
