type Role = 'user' | 'moderator' | 'admin'

const STYLES: Record<Role, string> = {
  admin:     'bg-primary/20 text-primary',
  moderator: 'bg-blue-500/20 text-blue-400',
  user:      'bg-border text-muted',
}
const LABELS: Record<Role, string> = {
  admin:     'Admin',
  moderator: 'Mod',
  user:      'Kullanıcı',
}

export default function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded ${STYLES[role] ?? STYLES.user}`}>
      {LABELS[role] ?? role}
    </span>
  )
}
