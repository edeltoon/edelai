import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EdelAI",
  description: "AI 오류 검증 기반 대학 학습 평가 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
