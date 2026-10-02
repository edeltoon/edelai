import type { Role } from '@/types/session';

const LABEL: Record<Role, string> = { student: '학생', professor: '교수' };

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap rounded-full bg-sejong-soft px-3 text-caption font-semibold text-sejong">
      {LABEL[role]}
    </span>
  );
}
