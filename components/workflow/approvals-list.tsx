"use client"

import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ApprovalsList() {
  const { data, mutate } = useSWR("/api/approvals/pending", fetcher)
  const onAction = async (expenseId: number, action: "APPROVE" | "REJECT", comment: string) => {
    const res = await fetch(`/api/approvals/${expenseId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    })
    if (res.ok) mutate()
    else alert((await res.json()).error || "Failed")
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {(data?.items || []).map((item: any) => (
        <Card key={`${item.expense.id}:${item.step_runtime_id}`}> 
          <CardHeader>
            <CardTitle>
              Expense #{item.expense.id} • {item.expense.employee_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="text-sm text-muted-foreground">
              {item.expense.category} • {item.expense.amount} {item.expense.currency_code} →{" "}
              {item.expense.company_amount} {item.expense.company_currency_code}
            </div>
            <div className="text-sm">{item.expense.description}</div>
            <div className="text-xs text-muted-foreground">
              Step {item.step_order + 1} • Mode {item.step_mode}
            </div>
            <Textarea placeholder="Comment (optional)" onChange={(e) => (item._comment = e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => onAction(item.expense.id, "APPROVE", item._comment || "")}>Approve</Button>
              <Button variant="destructive" onClick={() => onAction(item.expense.id, "REJECT", item._comment || "")}>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
