import Anthropic from '@anthropic-ai/sdk'

let client = null

export function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}
