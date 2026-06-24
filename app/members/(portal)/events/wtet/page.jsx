import { redirect } from 'next/navigation'

// Registration now happens on the public /wtet page — members are detected automatically
export default function WtetMemberRedirect() {
  redirect('/wtet')
}
