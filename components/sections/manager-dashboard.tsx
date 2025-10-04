"use client"

import useSWR from "swr"
import { ApprovalsList } from "../workflow/approvals-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ManagerDashboard({ session }: { session: { name: string } }) {
  const { data: stats } = useSWR("/api/manager/stats", fetcher)

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Welcome, {session.name}</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Pending for You</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats?.pending ?? "-"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team Expenses (This Month)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats?.teamMonth ?? "-"}</CardContent>
        </Card>
      </div>
      <section className="grid gap-3">
        <h2 className="text-xl font-medium">Approvals Queue</h2>
        <ApprovalsList />
      </section>
    </div>
  )
}
