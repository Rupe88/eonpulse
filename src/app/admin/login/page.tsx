import { redirect } from "next/navigation";

/**
 * Bookmark-friendly entry: sends users through the same OTP flow with return to /admin.
 */
export default function AdminLoginRedirectPage() {
  redirect("/login?next=%2Fadmin");
}
