export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-10 flex items-center justify-center overflow-hidden bg-gray-50">
      <div className="w-full max-w-sm shrink-0 px-4">{children}</div>
    </div>
  );
}
