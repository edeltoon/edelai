import { handleGenerateCards } from '@/lib/server/generate-cards';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  return handleGenerateCards(request);
}
