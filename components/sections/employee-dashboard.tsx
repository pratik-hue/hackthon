"use client"

import { ExpenseForm } from "../submission/expense-form"
import { ExpenseHistory } from "../submission/expense-history"

export default function EmployeeDashboard({ session }: { session: { name: string } }) {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Hello, {session.name}</h1>
      <ExpenseForm />
      <ExpenseHistory />
    </div>
  )
}
