export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#EF323F]" />
            <span className="text-2xl font-bold text-[#2D2D2D]">DotZero</span>
          </div>
          <p className="mt-1 text-sm text-[#5D5B5B]">CR Portal</p>
        </div>
        <div className="rounded-lg bg-white p-8 shadow-sm border border-[#D3D3D3]">
          {children}
        </div>
      </div>
    </div>
  );
}
