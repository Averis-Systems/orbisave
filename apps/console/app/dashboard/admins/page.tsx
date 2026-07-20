import { redirect } from 'next/navigation'

/**
 * Platform admins now live on the Users page under the Staff tab, so that
 * staff and members are two views of one page rather than two nav entries
 * listing overlapping populations.
 *
 * This route is kept as a redirect rather than deleted because it was linked
 * from the sidebar and may be bookmarked. The page it replaced also carried a
 * "Provision Admin" button, a search box and a row menu that had no handlers,
 * plus a "Verified Device" line rendered for every admin from no data at all.
 */
export default function AdminsRedirect() {
  redirect('/dashboard/users?tab=staff')
}
