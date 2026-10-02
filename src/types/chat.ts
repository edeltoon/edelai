export type ChatMessage = { role: "user" | "model"; text: string };

export type ChatRequest = {
  courseId: "phil";
  message: string;
  history?: ChatMessage[];
};

export type ChatResponse =
  | { ok: true; reply: string; source: "claude"; model: string }
  | { ok: false; error: { code: string; message: string } };
