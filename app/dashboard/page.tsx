import { readSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import AdminDashboard from "@/components/sections/admin-dashboard"
import ManagerDashboard from "@/components/sections/manager-dashboard"
import EmployeeDashboard from "@/components/sections/employee-dashboard"

export default async function DashboardPage() {
  const session = await readSession()
  if (!session) redirect("/login")

  return (
    <main className="min-h-dvh p-6 grid gap-6">
      {session.role === "ADMIN" && <AdminDashboard session={session} />}
      {session.role === "MANAGER" && <ManagerDashboard session={session} />}
      {session.role === "EMPLOYEE" && <EmployeeDashboard session={session} />}
    </main>
  )
}
