import type { Metadata } from "next";

const title = "택병증권";
const description =
  "택병서버의 한국·미국 주식, ETF, 레버리지, 옵션과 플레이어 포트폴리오를 확인하고 거래하는 증권 서비스입니다.";

export const metadata: Metadata = {
  title,
  description,
  manifest: "/securities.webmanifest",
  icons: {
    icon: [
      { url: "/securities-favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/securities-favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/securities-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/securities-favicon-32.png",
    apple: [
      {
        url: "/securities-apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title,
    description,
    type: "website",
    locale: "ko_KR",
    images: [
      {
        url: "/securities-icon.png",
        width: 512,
        height: 512,
        alt: "택병증권",
      },
    ],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/securities-icon.png"],
  },
};

export default function MarketLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
