export const sportmonksProviderManifest = {
  id: 'sportmonks',
  label: 'Sportmonks trial adapter',
  serverOnly: true,
  baseUrl: 'https://api.sportmonks.com/v3/football',
  resources: {
    fixtures: '/fixtures?include=participants;scores;state;venue',
    standings: '/standings',
    results: '/fixtures?include=participants;scores;state;venue',
    teams: '/teams',
  },
}

export function normalizeSportmonksFixture(raw) {
  return {
    provider: 'sportmonks',
    providerFixtureId: String(raw.id ?? ''),
    stage: raw.stage?.name ?? raw.round?.name ?? 'unknown',
    status: raw.state?.name ?? 'scheduled',
    kickoffAt: raw.starting_at ?? null,
    raw,
  }
}
