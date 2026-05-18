import FAQContent from '../../components/FAQContent'

export const metadata = {
  title: 'FAQ | Canvas Routes — Montreal Car Club',
  description: "Frequently asked questions about Canvas Routes — Montreal's luxury car club. Cars and coffee, road trips from Montreal, membership, and more.",
  keywords: 'Canvas Routes FAQ, car club Montreal, road trips from Montreal, cars and coffee Montreal, automotive community Montreal, luxury car meets Quebec',
  alternates: { canonical: 'https://canvasroutes.com/faq' },
  openGraph: {
    title: 'FAQ | Canvas Routes — Montreal Car Club',
    description: "Frequently asked questions about Canvas Routes — Montreal's luxury car club. Cars and coffee, road trips from Montreal, membership, and more.",
    url: 'https://canvasroutes.com/faq',
  },
}

export default function FAQ() {
  return <FAQContent />
}
