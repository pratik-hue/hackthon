import Link from "next/link"
import { readSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const session = await readSession()
  if (session) {
    redirect("/dashboard")
  }
  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-6">
        <h1 className="text-3xl md:text-4xl font-semibold text-balance">
          Smart Expense Management with Multi-level Approvals
        </h1>
        <p className="text-muted-foreground text-pretty">
          Submit, approve, and track expenses with flexible rules, automatic currency conversion, and OCR for receipts.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/login">Get Started</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/login?tab=signup">Create Company</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
