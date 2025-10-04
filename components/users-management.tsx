"use client"

import type React from "react"

import useSWR from "swr"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const fetcher = (u: string) => fetch(u).then((r) => r.json())

export function UsersManagement() {
  const { data, mutate } = useSWR("/api/users", fetcher)
  const users = (data?.items as any[]) || []
  const managers = users.filter((u: any) => u && u.role !== "EMPLOYEE" && u.id)

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", manager_id: 0 })

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ name: "", email: "", password: "", role: "EMPLOYEE", manager_id: 0 })
      mutate()
    } else {
      alert((await res.json()).error || "Failed")
    }
  }

  const updateRole = async (id: number, role: string, manager_id: number) => {
    const res = await fetch(`/api/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, manager_id }),
    })
    if (res.ok) mutate()
    else alert((await res.json()).error || "Failed")
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={createUser} className="grid md:grid-cols-5 gap-3">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Manager</Label>
              <Select
                value={String(form.manager_id)}
                onValueChange={(v) => setForm((p) => ({ ...p, manager_id: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {managers.map((m: any) => {
                    if (!m?.id) return null
                    return (
                      <SelectItem key={`mgr-${String(m.id)}`} value={String(m.id)}>
                        {m.name} ({m.role})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-5">
              <Button type="submit">Add User</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u: any, idx: number) => (
              <TableRow key={`${u?.id ?? "noid"}:${u?.email ?? idx}`}> 
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.manager_name || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Select defaultValue={u.role} onValueChange={(role) => updateRole(u.id, role, u.manager_id || 0)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                        <SelectItem value="MANAGER">MANAGER</SelectItem>
                        <SelectItem value="ADMIN">ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      defaultValue={String(u.manager_id || 0)}
                      onValueChange={(mid) => updateRole(u.id, u.role, Number(mid))}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        {managers.map((m: any) => {
                          if (!m?.id) return null
                          return (
                            <SelectItem key={`mgr-${String(m.id)}`} value={String(m.id)}>
                              {m.name} ({m.role})
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
