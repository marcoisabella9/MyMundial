export const normalizedResources = [
  'fixtures',
  'teams',
  'standings',
  'results',
  'predictions',
  'award_picks',
]

export const providerTrialMatrix = [
  {
    id: 'sportmonks',
    label: 'Sportmonks',
    status: 'backup provider check',
    strengths: 'Rich football coverage if API-FOOTBALL has weak World Cup 2026 coverage.',
    nextCheck: 'Verify World Cup package coverage and commercial terms only if the first provider is insufficient.',
  },
  {
    id: 'api-football',
    label: 'API-FOOTBALL',
    status: 'V1 first choice',
    strengths: 'Straightforward fixtures, teams, scores, standings, and result endpoints for the lean MVP.',
    nextCheck: 'Verify World Cup 2026 coverage, request limits, and match result latency with a trial key.',
  },
]

export function getFootballProviderContract() {
  return {
    methods: [
      'syncFixtures()',
      'syncTeams()',
      'syncStandings()',
      'syncResults()',
    ],
    frontendRule: 'The browser reads normalized MyMundial tables only. Provider keys and raw provider calls stay server-side.',
  }
}
