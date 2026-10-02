/** 교표 자리 워드마크. 공식 교표 이미지는 쓰지 않는다 */
export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-sejong"
      >
        <span className="size-4 rounded-full bg-sejong" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-title font-bold tracking-tight text-ink">세종대학교</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-wider text-ink">SEJONG UNIVERSITY</span>
      </span>
    </div>
  );
}
