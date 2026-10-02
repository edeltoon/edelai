import { handleChat } from "../../../lib/server/chat.ts";

export const runtime = "nodejs";
// Claude 호출(최대 25~30초 시간 제한)을 기다릴 수 있도록 배포 함수 실행 시간을 늘린다
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleChat(request);
}
