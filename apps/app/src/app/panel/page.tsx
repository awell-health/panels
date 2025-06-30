import { redirect } from 'next/navigation'

export default function PanelPage() {
  // Redirect to a default dashboard ID
  redirect('/panel/default')
}
