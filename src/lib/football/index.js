import { getFootballProviderContract, normalizedResources, providerTrialMatrix } from './providerContract'
import { apiFootballProviderManifest } from './providers/apiFootballProvider'
import { mockFootballProvider } from './providers/mockProvider'
import { sportmonksProviderManifest } from './providers/sportmonksProvider'

export const footballProviderReadiness = {
  resources: normalizedResources,
  contract: getFootballProviderContract(),
  trials: providerTrialMatrix,
  providers: [mockFootballProvider, sportmonksProviderManifest, apiFootballProviderManifest],
}

export async function createMockSyncPreview() {
  const [teams, fixtures, standings] = await Promise.all([
    mockFootballProvider.syncTeams(),
    mockFootballProvider.syncFixtures(),
    mockFootballProvider.syncStandings(),
  ])

  return {
    teams: teams.length,
    fixtures: fixtures.length,
    standings: standings.length,
  }
}
