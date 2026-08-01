import type { Metadata } from "next";
import "./globals.css";

const title = "택병서버 플레이어 가이드";
const description =
  "택병서버의 시작 방법, 경제, 퀘스트, 양조, 낚시, 동료를 정리한 플레이어 가이드입니다.";

export const metadata: Metadata = {
  metadataBase: new URL("https://taekbyeong-guide.fasho-7.chatgpt.site/"),
  title,
  description,
  icons: {
    icon: "/server-icon.png",
    shortcut: "/server-icon.png",
  },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "택병서버 플레이어 가이드",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
