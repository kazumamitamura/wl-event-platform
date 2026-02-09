import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ウエイトリフティング競技運営プラットフォーム",
  description: "リアルタイム進行管理と選手待機本数確認システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
