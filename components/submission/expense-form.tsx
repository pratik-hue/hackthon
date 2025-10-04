"use client"

import type React from "react"

import { useState } from "react"
import Tesseract from "tesseract.js"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD", "CHF", "CNY"]

export function ExpenseForm() {
  const [form, setForm] = useState({
    amount: "",
    currency: "USD",
    category: "",
    description: "",
    date: "",
    receipt: null as File | null,
    receiptBase64: "",
    ocrText: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const onFile = async (f: File | null) => {
    if (!f) return
    setForm((prev) => ({ ...prev, receipt: f }))
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => ({ ...prev, receiptBase64: String(reader.result) }))
    reader.readAsDataURL(f)

    // OCR
    const { data } = await Tesseract.recognize(f, "eng", {
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-:/., ",
      // set crossOrigin via image load in tesseract internally
    })
    const text = data.text || ""
    // naive parsing: attempt extracting amount-like and date-like tokens
    setForm((prev) => ({
      ...prev,
      ocrText: text,
      description: prev.description || text.slice(0, 140),
    }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || !form.currency || !form.date) {
      alert("Amount, Currency and Date are required")
      return
    }
    setSubmitting(true)
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(form.amount),
        currency: form.currency,
        category: form.category || "General",
        description: form.description,
        date: form.date,
        receiptBase64: form.receiptBase64,
        ocrText: form.ocrText,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      alert("Expense submitted")
      setForm({
        amount: "",
        currency: "USD",
        category: "",
        description: "",
        date: "",
        receipt: null,
        receiptBase64: "",
        ocrText: "",
      })
    } else {
      alert((await res.json()).error || "Failed")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                placeholder="Meals, Travel, Office..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Receipt</Label>
              <Input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Description (auto-filled from OCR)</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Expense"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
