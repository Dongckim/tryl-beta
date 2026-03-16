import { AuthLayoutColumns } from "@/components/auth/AuthLayoutColumns";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayoutColumns>{children}</AuthLayoutColumns>;
}
