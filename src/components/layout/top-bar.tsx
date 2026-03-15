interface TopBarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, description, actions }: TopBarProps) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#1a1a1a] px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-[15px] font-semibold text-white">{title}</h1>
        {description && (
          <span className="text-[13px] text-[#555]">{description}</span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
