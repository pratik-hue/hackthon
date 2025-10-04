"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function ExpenseHistory() {
  const { data } = useSWR("/api/expenses/history", fetcher)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Company Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items || []).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.spend_date).toLocaleDateString()}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell className="text-right">
                    {e.amount} {e.currency_code}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.company_amount} {e.company_currency_code}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        e.status === "APPROVED" ? "default" : e.status === "REJECTED" ? "destructive" : "secondary"
                      }
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
