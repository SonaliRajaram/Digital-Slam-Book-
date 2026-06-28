import "./globals.css";

export const metadata = {
  title: "Digital Slam Book",
  description: "A memory book from everyone who mattered.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
