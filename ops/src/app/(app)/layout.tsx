import { Shell } from "@/components/shell";
import { requireUser } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <Shell name={user.name} role={user.role}>
      {children}
    </Shell>
  );
}
