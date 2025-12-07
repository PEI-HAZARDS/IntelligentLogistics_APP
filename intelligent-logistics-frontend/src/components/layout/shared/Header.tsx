import './header.css';

type Props = {
  title?: string;
  subtitle?: string;
  user?: string;
};

export default function Header({ title, subtitle, user }: Props) {
  const initials = (user || 'MV')
    .split(' ')
    .map(s => s.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="header-root">
      <div className="header-left">
        <div className="header-title">{title}</div>
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>

      <div className="header-right">
        <div className="header-user">{user}</div>
        <div className="header-avatar">{initials}</div>
      </div>
    </header>
  );
}