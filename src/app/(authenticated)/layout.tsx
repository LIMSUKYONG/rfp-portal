import { getCurrentUser } from "@/lib/auth/session";
import Sidebar from "./_components/sidebar";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={
          user
            ? { name: user.name, companyName: user.tenant_name, role: user.role }
            : null
        }
      />

      {/* Main content — offset by sidebar width */}
      <div className="ml-[220px] flex-1 overflow-auto bg-gray-50 dark:bg-background">
        {children}
      </div>
    </div>
  );
}
