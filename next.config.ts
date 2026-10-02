import type { NextConfig } from "next";

// GitHub Pages(https://edeltoon.github.io/edelai/)용 정적 빌드 설정
// 레포 이름이 바뀌면 basePath도 같이 바꿀 것
const nextConfig: NextConfig = {
  output: "export", // npm run build → out/ 폴더에 정적 HTML 생성
  basePath: "/edelai", // 개발 주소도 http://localhost:3000/edelai/
  trailingSlash: true, // /student → /student/index.html (새로고침 404 방지)
  images: { unoptimized: true }, // 정적 export에는 이미지 최적화 서버가 없음
};

export default nextConfig;
