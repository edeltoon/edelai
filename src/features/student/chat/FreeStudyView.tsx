'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Conversation, ConversationMessage } from '@/types/student-records';
import { findStudyAid } from '../content/studyAids';
import { studentRoutes } from '../routes';
import { askTutor, checkDirectAnswer } from '../services/ai';
import { newId } from '../services/ids';
import { studentStore } from '../services/store';
import { useStudent } from '../StudentSession';
import { ChatInput } from './ChatInput';
import { AiMessage, ChallengeInvite, DirectAnswerNotice, PendingAnswer, UserMessage } from './ChatMessages';
import { chatProblemOf, conversationTitle, type ChatProblem } from './chatProblem';

// 자유 학습: 과목 AI와 대화 (POST /api/chat, 스트리밍 아님).
// - 대화 기록은 이 브라우저(local)에 저장한다 (server 모드도 같음, 서버 저장은 시연 뒤)
// - 주소 ?c=대화id 로 대화를 고른다. ?c가 없으면 새 대화이고, 첫 질문을 보내면 대화가 만들어진다
// - 정답 직행 요청(src/lib/directAnswer, 챌린지 채점과 같은 규칙)은 /api/chat을 부르지 않고 안내만 하고, 시도를 기록한다

const EXAMPLE_QUESTIONS = [
  '이데아론이 뭐야?',
  '동굴의 비유는 무엇을 말하려는 거야?',
  '플라톤과 아리스토텔레스는 실재를 어떻게 다르게 봤어?',
];

type View =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; conversation: Conversation | null };

export function FreeStudyView({ courseId }: { courseId: 'phil' }) {
  const student = useStudent();
  const router = useRouter();
  const conversationId = useSearchParams().get('c');
  const [view, setView] = useState<View>({ status: 'loading' });
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ conversationId: string; problem: ChatProblem } | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const busy = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const current = view.status === 'ready' ? view.conversation : null;

  // ?c가 바뀌면 그 대화를 읽는다. 방금 만든 대화로 주소만 바뀐 경우는 다시 읽지 않는다
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!conversationId) {
        if (alive) setView({ status: 'ready', conversation: null });
        return;
      }
      if (current?.id === conversationId) return;
      const found = await studentStore.getConversation(student.userId, conversationId);
      if (!alive) return;
      setView(found && found.courseId === courseId ? { status: 'ready', conversation: found } : { status: 'missing' });
    })();
    return () => {
      alive = false;
    };
    // current는 위 비교에만 쓴다 (대화 내용이 바뀔 때마다 다시 읽지 않게)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, courseId, student.userId]);

  const messageCount = current?.messages.length ?? 0;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messageCount, pendingId]);

  /** 저장 후, 지금 보고 있는 대화일 때만 화면에 반영. adopt: 새 대화 화면에서 첫 질문으로 대화를 만든 경우 */
  async function save(next: Conversation, adopt = false) {
    await studentStore.saveConversation(next);
    setView((v) =>
      v.status === 'ready' && (v.conversation?.id === next.id || (adopt && v.conversation === null))
        ? { status: 'ready', conversation: next }
        : v,
    );
  }

  /** previous: 이번 질문 전까지의 메시지 (history를 만든다) */
  async function ask(conversation: Conversation, previous: readonly ConversationMessage[], question: string) {
    setPendingId(conversation.id);
    setFailure(null);
    try {
      const res = await askTutor({ courseId, message: question, previous });
      if (!res.ok) {
        setFailure({ conversationId: conversation.id, problem: chatProblemOf(res.status, res.code, res.message) });
        return;
      }
      const aid = findStudyAid(question);
      const answer: ConversationMessage = {
        id: newId('msg'),
        role: 'ai',
        text: res.reply,
        at: new Date().toISOString(),
        ...(aid ? { concepts: aid.concepts, citations: aid.citations, suggestChallengeId: aid.challengeId } : {}),
      };
      // 기다리는 동안 다른 대화로 옮겨 갔어도 원래 대화에 붙인다
      const latest = (await studentStore.getConversation(student.userId, conversation.id)) ?? conversation;
      await save({ ...latest, updatedAt: answer.at, messages: [...latest.messages, answer] });
    } finally {
      setPendingId(null);
    }
  }

  async function send(raw: string) {
    const question = raw.trim();
    if (!question || busy.current || view.status !== 'ready') return;
    busy.current = true;
    setRecordError(null);
    try {
      const now = new Date().toISOString();
      const base: Conversation = current ?? {
        id: newId('conv'),
        studentId: student.userId,
        courseId,
        title: conversationTitle(question),
        createdAt: now,
        updatedAt: now,
        messages: [],
      };
      const userMessage: ConversationMessage = { id: newId('msg'), role: 'user', text: question, at: now };
      const direct = checkDirectAnswer(question);

      if (direct.isDirect) {
        const notice: ConversationMessage = {
          id: newId('msg'),
          role: 'notice',
          text: '정답만 바로 알려 드리지 않고 검증 챌린지로 안내했어요.',
          at: now,
          directAnswer: { matched: direct.matched ?? '' },
        };
        await save({ ...base, updatedAt: now, messages: [...base.messages, userMessage, notice] }, !current);
        if (!current) router.replace(studentRoutes.freeStudy(courseId, base.id), { scroll: false });
        try {
          await studentStore.addDirectAnswerAttempt({
            id: newId('daa'),
            studentId: student.userId,
            courseId,
            conversationId: base.id,
            text: question,
            matched: direct.matched ?? '',
            at: now,
          });
        } catch (e) {
          setRecordError(e instanceof Error ? e.message : '요청 기록을 저장하지 못했어요.');
        }
        return;
      }

      const withQuestion = { ...base, updatedAt: now, messages: [...base.messages, userMessage] };
      await save(withQuestion, !current);
      if (!current) router.replace(studentRoutes.freeStudy(courseId, base.id), { scroll: false });
      await ask(withQuestion, base.messages, question);
    } finally {
      busy.current = false;
    }
  }

  async function retry() {
    if (!current || busy.current) return;
    const last = current.messages.at(-1);
    if (last?.role !== 'user') return;
    busy.current = true;
    try {
      await ask(current, current.messages.slice(0, -1), last.text);
    } finally {
      busy.current = false;
    }
  }

  if (view.status === 'loading') {
    return <p className="px-8 py-10 text-body text-ink-sub" role="status">대화를 불러오고 있어요…</p>;
  }
  if (view.status === 'missing') {
    return (
      <section className="mx-auto w-full max-w-[720px] px-4 py-12 sm:px-8" role="status">
        <h2 className="text-lead font-bold text-ink">대화를 찾을 수 없어요</h2>
        <p className="mt-2 text-body text-ink-sub">대화 기록은 이 브라우저에만 저장돼요. 다른 기기나 시연 리셋 뒤에는 보이지 않아요.</p>
        <Link href={studentRoutes.freeStudy(courseId)} className="mt-5 inline-flex h-10 items-center rounded-control bg-sejong px-4 text-body font-semibold text-(--color-page)">
          새 대화 시작
        </Link>
      </section>
    );
  }

  const messages = current?.messages ?? [];
  const waiting = pendingId !== null && pendingId === current?.id;
  const last = messages.at(-1);
  const unanswered = !waiting && last?.role === 'user';
  const problem = failure && failure.conversationId === current?.id ? failure.problem : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 px-4 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-[760px] space-y-6">
          {messages.length === 0 && !waiting && <EmptyState courseId={courseId} onAsk={send} />}

          {messages.map((m) =>
            m.role === 'user' ? (
              <UserMessage key={m.id} text={m.text} />
            ) : m.role === 'ai' ? (
              <AiMessage key={m.id} message={m} courseId={courseId} />
            ) : m.directAnswer ? (
              <DirectAnswerNotice key={m.id} courseId={courseId} />
            ) : (
              <p key={m.id} className="text-caption text-ink-sub">{m.text}</p>
            ),
          )}

          {waiting && <PendingAnswer />}
          {unanswered && (
            <FailureNotice
              problem={problem ?? { title: '답변을 받지 못한 질문이에요', body: '연결이 끊겼거나 답을 받기 전에 화면을 떠났어요. 다시 보내 볼까요?', action: 'retry' }}
              courseId={courseId}
              onRetry={retry}
            />
          )}
          {recordError && (
            <p role="alert" className="text-caption text-wrong">
              안내는 보여 드렸지만 요청 기록을 저장하지 못했어요. {recordError}
            </p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="sticky bottom-0">
        <ChatInput disabled={pendingId !== null} onSend={send} placeholder="서양철학에 대해 자유롭게 질문하세요…" />
      </div>
    </div>
  );
}

function EmptyState({ courseId, onAsk }: { courseId: string; onAsk: (text: string) => void }) {
  return (
    <section className="pt-6" aria-label="새 대화">
      <h2 className="text-lead font-bold text-ink">서양철학, 무엇이든 물어보세요</h2>
      <p className="mt-1 text-body text-ink-sub">개념을 정리하고, 같은 개념의 검증 챌린지에서 AI 답변의 오류를 직접 찾아보세요.</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((q) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => onAsk(q)}
              className="rounded-control border border-line bg-page px-3 py-2 text-body text-ink hover:border-line-strong"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
      <ChallengeInvite courseId={courseId} text="이미 공부했다면 검증 챌린지로 바로 가 볼까요?" />
    </section>
  );
}

function FailureNotice({ problem, courseId, onRetry }: { problem: ChatProblem; courseId: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-block bg-wrong-bg px-4 py-3">
      <p className="text-body font-semibold text-wrong">{problem.title}</p>
      <p className="mt-1 text-body text-ink">{problem.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {problem.action === 'retry' && (
          <button type="button" onClick={onRetry} className="inline-flex h-9 items-center rounded-control bg-sejong px-3 text-caption font-semibold text-(--color-page)">
            다시 보내기
          </button>
        )}
        {problem.action === 'login' && (
          <Link href="/" className="inline-flex h-9 items-center rounded-control bg-sejong px-3 text-caption font-semibold text-(--color-page)">
            로그인 화면으로
          </Link>
        )}
        {problem.action === 'newChat' && (
          <Link href={studentRoutes.freeStudy(courseId)} className="inline-flex h-9 items-center rounded-control bg-sejong px-3 text-caption font-semibold text-(--color-page)">
            새 대화 시작
          </Link>
        )}
        {problem.action === 'challenge' && (
          <Link href={studentRoutes.challenges(courseId)} className="inline-flex h-9 items-center rounded-control border border-line bg-page px-3 text-caption font-semibold text-ink">
            검증 챌린지로 가기 →
          </Link>
        )}
      </div>
    </div>
  );
}
