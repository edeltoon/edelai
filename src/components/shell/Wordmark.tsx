import Image from 'next/image';

/** 교표 + 학교 이름 워드마크 (시연용, 교표 이미지: public/sejong-emblem.png) */
export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/sejong-emblem.png" alt="" width={39} height={36} priority className="size-9 shrink-0 object-contain" />
      <span className="flex flex-col leading-none">
        <span className="text-title font-bold tracking-tight text-ink">세종대학교</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-wider text-ink">SEJONG UNIVERSITY</span>
      </span>
    </div>
  );
}
