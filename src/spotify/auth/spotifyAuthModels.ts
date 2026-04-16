export type StoredSpotifyTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
  tokenType: string
}

export type SpotifyTokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope?: string
  error?: string
  error_description?: string
}
