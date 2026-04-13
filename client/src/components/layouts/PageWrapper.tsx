interface PageWrapperProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageWrapper({ title, children, actions }: PageWrapperProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-[#D3D3D3] bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-[#2D2D2D]">{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="flex-1 overflow-auto p-6 bg-[#F7F7F7]">{children}</div>
    </div>
  );
}
