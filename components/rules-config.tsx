"use client"

import useSWR from "swr"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export function RulesConfig() {
  const { data, mutate } = useSWR("/api/rules", fetcher)
  const users = data?.users || []
  const rules = data?.rules || []

  const [rule, setRule] = useState({
    name: "",
    min_amount: 0,
    max_amount: 0,
    percentage_threshold: 0, // 0 means disable
    specific_approver_user_id: 0,
    hybrid_mode: "NONE", // NONE | OR | AND
    manager_is_first_approver: true,
    steps: [] as { mode: "ALL" | "PERCENTAGE"; threshold: number; approvers: number[] }[],
  })

  const addStep = () => setRule((p) => ({ ...p, steps: [...p.steps, { mode: "ALL", threshold: 100, approvers: [] }] }))
  const save = async () => {
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule),
    })
    if (res.ok) {
      setRule({
        name: "",
        min_amount: 0,
        max_amount: 0,
        percentage_threshold: 0,
        specific_approver_user_id: 0,
        hybrid_mode: "NONE",
        manager_is_first_approver: true,
        steps: [],
      })
      mutate()
    } else {
      alert((await res.json()).error || "Failed")
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="pt-6 grid gap-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={rule.name} onChange={(e) => setRule((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Min Amount</Label>
              <Input
                type="number"
                value={rule.min_amount}
                onChange={(e) => setRule((p) => ({ ...p, min_amount: Number(e.target.value) }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Max Amount</Label>
              <Input
                type="number"
                value={rule.max_amount}
                onChange={(e) => setRule((p) => ({ ...p, max_amount: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <div className="grid gap-2">
              <Label>Percent Threshold (0 to disable)</Label>
              <Input
                type="number"
                value={rule.percentage_threshold}
                onChange={(e) => setRule((p) => ({ ...p, percentage_threshold: Number(e.target.value) }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Specific Approver (Auto-approve if approves)</Label>
              <Select
                value={String(rule.specific_approver_user_id)}
                onValueChange={(v) => setRule((p) => ({ ...p, specific_approver_user_id: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Hybrid Mode</Label>
              <Select value={rule.hybrid_mode} onValueChange={(v) => setRule((p) => ({ ...p, hybrid_mode: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">NONE</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                  <SelectItem value="AND">AND</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Manager is first approver</Label>
              <div className="flex items-center h-10">
                <Switch
                  checked={rule.manager_is_first_approver}
                  onCheckedChange={(v) => setRule((p) => ({ ...p, manager_is_first_approver: v }))}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>Steps</Label>
              <Button variant="secondary" onClick={addStep}>
                Add Step
              </Button>
            </div>
            {rule.steps.map((s, idx) => (
              <div key={idx} className="grid md:grid-cols-4 gap-3 p-3 rounded-md border">
                <div className="grid gap-2">
                  <Label>Mode</Label>
                  <Select
                    value={s.mode}
                    onValueChange={(v: any) =>
                      setRule((p) => {
                        const steps = [...p.steps]
                        steps[idx] = { ...steps[idx], mode: v }
                        return { ...p, steps }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">ALL</SelectItem>
                      <SelectItem value="PERCENTAGE">PERCENTAGE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Threshold (%)</Label>
                  <Input
                    type="number"
                    value={s.threshold}
                    onChange={(e) =>
                      setRule((p) => {
                        const steps = [...p.steps]
                        steps[idx] = { ...steps[idx], threshold: Number(e.target.value) }
                        return { ...p, steps }
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2 grid gap-2">
                  <Label>Approvers</Label>
                  <div className="flex flex-wrap gap-2">
                    {users.map((u: any) => {
                      const selected = s.approvers.includes(u.id)
                      return (
                        <Button
                          key={u.id}
                          type="button"
                          variant={selected ? "default" : "secondary"}
                          onClick={() =>
                            setRule((p) => {
                              const steps = [...p.steps]
                              const arr = new Set(steps[idx].approvers)
                              if (arr.has(u.id)) arr.delete(u.id)
                              else arr.add(u.id)
                              steps[idx] = { ...steps[idx], approvers: Array.from(arr) as number[] }
                              return { ...p, steps }
                            })
                          }
                        >
                          {u.name} ({u.role})
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Button onClick={save}>Save Rule</Button>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Amount Range</TableHead>
              <TableHead>Hybrid</TableHead>
              <TableHead>Steps</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  {r.min_amount} - {r.max_amount}
                </TableCell>
                <TableCell>{r.hybrid_mode}</TableCell>
                <TableCell>{r.step_summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
