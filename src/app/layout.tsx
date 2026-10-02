import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SeTask | 세종대학교 AI 학습 공간 (시연용)", template: "%s | SeTask" },
  description: "AI 오류 검증 기반 대학 학습 평가 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard Variable (CDN). Geist 등 기본 폰트는 쓰지 않는다 */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
