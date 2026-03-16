import { AppContent } from "./AppContent";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppContent>{children}</AppContent>;
}
