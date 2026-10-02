'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

const MAX_CHARS = 4000;

/** 하단 질문 입력: Enter 전송, Shift+Enter 줄바꿈(한글 조합 중 Enter는 무시), 전송 중 잠금 */
export function ChatInput({ disabled, onSend, placeholder }: { disabled: boolean; onSend: (text: string) => void; placeholder: string }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = !disabled && text.trim().length > 0;

  function send() {
    if (!canSend) return;
    onSend(text);
    setText('');
    if (ref.current) ref.current.style.height = '';
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  }

  return (
    <div className="border-t border-line-soft bg-page px-4 pb-4 pt-3 sm:px-8">
      <div className="mx-auto flex w-full max-w-[760px] items-end gap-2 rounded-block border border-line-soft bg-page px-4 py-2 focus-within:border-line-strong">
        <label htmlFor="free-study-input" className="sr-only">
          과목 AI에게 질문
        </label>
        <textarea
          id="free-study-input"
          ref={ref}
          rows={1}
          value={text}
          maxLength={MAX_CHARS}
          readOnly={disabled}
          aria-disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = '';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="max-h-[180px] min-h-10 flex-1 resize-none bg-transparent py-2 text-body text-ink outline-none placeholder:text-ink-sub"
        />
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          aria-label="질문 보내기"
          className="mb-1 grid size-9 shrink-0 place-items-center rounded-full bg-sejong text-(--color-page) disabled:opacity-40"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
            <path d="M10 16V4M4.5 9.5 10 4l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <p className="mx-auto mt-2 w-full max-w-[760px] text-center text-caption text-ink-sub">
        {disabled ? '답변을 받는 중에는 새 질문을 보낼 수 없어요.' : 'Enter로 보내고 Shift+Enter로 줄을 바꿔요. 검증 챌린지는 별도 탭에서 풀어요.'}
        {text.length > MAX_CHARS - 500 && ` · ${text.length.toLocaleString()}/${MAX_CHARS.toLocaleString()}자`}
      </p>
    </div>
  );
}
