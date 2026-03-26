/**
 * API Beehiiv: criação de assinatura (documentação oficial).
 * Requer BEEHIIV_API_KEY e BEEHIIV_PUBLICATION_ID.
 */
export async function subscribeToBeehiiv(email: string): Promise<void> {
  const apiKey = process.env.BEEHIIV_API_KEY
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !publicationId) return

  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    console.error("[beehiiv] subscribe failed", res.status, text)
  }
}
