import type { NextConfig } from "next";

// 레포 이름이 바뀌면 basePath도 같이 바꿀 것
const nextConfig: NextConfig = {
  // 팀 확인 필요: LLM API 라우트(Claude API, 서버 경유)를 쓸 예정이라 정적 export를 꺼 둔다.
  // 다시 GitHub Pages 정적 배포로 돌아가면 아래 주석을 풀고 API 라우트를 빼야 한다.
  // output: "export",
  basePath: "/edelai", // 개발 주소도 http://localhost:3000/edelai/
  trailingSlash: true, // /student → /student/index.html (새로고침 404 방지)
  images: { unoptimized: true },
};

export default nextConfig;
