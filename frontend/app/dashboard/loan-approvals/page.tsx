import { redirect } from "next/navigation"

export default function LoanApprovalsRedirect() {
  redirect("/dashboard/my-loans")
}
