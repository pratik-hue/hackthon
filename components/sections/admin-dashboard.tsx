"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UsersManagement } from "../users-management"
import { RulesConfig } from "../rules-config"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function AdminDashboard({ session }: { session: { name: string } }) {
  const { data: stats } = useSWR("/api/admin/stats", fetcher)

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Welcome, {session.name}</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats?.totalExpenses ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats?.pendingApprovals ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats?.employees ?? "-"}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <section className="grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Users</h2>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
          <UsersManagement />
        </section>

        <section className="grid gap-3">
          <h2 className="text-xl font-medium">Approval Rules</h2>
          <RulesConfig />
        </section>
      </div>
    </div>
  )
}
