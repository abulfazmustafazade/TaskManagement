const colorFor = (id: string) => {
  const colors = ['bg-red-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500'];
  const idx = (id || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
};

const initials = (name: string) => (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

interface AvatarProps {
  user: { id?: string; full_name?: string; username?: string };
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function Avatar({ user, size = 'md' }: AvatarProps) {
  const sizes = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  };
  return (
    <div
      className={`rounded-full inline-flex items-center justify-center font-semibold flex-shrink-0 ${sizes[size]} ${colorFor(user?.id || user?.username || 'x')} text-white`}
      title={user?.full_name || user?.username}
    >
      {initials(user?.full_name || user?.username)}
    </div>
  );
}
