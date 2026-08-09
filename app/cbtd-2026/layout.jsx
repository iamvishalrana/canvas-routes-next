// Deliberately unlisted — this page is not yet linked from anywhere on the
// site (nav, homepage, /routes) and must not be surfaced by search until
// that changes. noindex is the correct mechanism here (vs. robots.txt
// disallow, which would also block crawling and hide any future inbound
// links' context) since the page has zero other discovery paths right now.
export const metadata = {
  robots: { index: false, follow: false },
}

export default function CbtdLayout({ children }) {
  return children
}
