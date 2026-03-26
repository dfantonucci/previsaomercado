import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { TrendingMarkets } from "@/components/trending-markets"
import { HowItWorks } from "@/components/how-it-works"
import { Newsletter } from "@/components/newsletter"
import { Footer } from "@/components/footer"
import { getTrendingMarkets } from "@/lib/markets"

export default async function Home() {
  const marketsPayload = await getTrendingMarkets()

  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <TrendingMarkets buckets={marketsPayload.buckets} />
      <HowItWorks />
      <Newsletter />
      <Footer />
    </main>
  )
}
