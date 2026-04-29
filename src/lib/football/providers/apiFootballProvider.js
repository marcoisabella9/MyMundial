export const apiFootballProviderManifest = {
  id: 'api-football',
  label: 'API-FOOTBALL trial adapter',
  serverOnly: true,
  baseUrl: 'https://v3.football.api-sports.io',
  resources: {
    fixtures: '/fixtures?league={leagueId}&season=2026',
    standings: '/standings?league={leagueId}&season=2026',
    results: '/fixtures?league={leagueId}&season=2026&status=FT',
    teams: '/teams?league={leagueId}&season=2026',
  },
}

export function normalizeApiFootballFixture(raw) {
  return {
    provider: 'api-football',
    providerFixtureId: String(raw.fixture?.id ?? ''),
    stage: raw.league?.round ?? 'unknown',
    status: raw.fixture?.status?.short ?? 'scheduled',
    kickoffAt: raw.fixture?.date ?? null,
    raw,
  }
}
