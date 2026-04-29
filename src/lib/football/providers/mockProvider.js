import { groups, teamMeta } from '../../../data'

export const mockFootballProvider = {
  id: 'mock',
  label: 'Mock MyMundial provider',

  async syncTeams() {
    return groups.flatMap((group) =>
      group.teams.map((team, index) => ({
        provider: 'mock',
        providerTeamId: team.toLowerCase().replaceAll(' ', '-'),
        fifaCode: teamMeta[team]?.code ?? team.slice(0, 3).toUpperCase(),
        name: team,
        groupCode: group.id,
        seed: `${group.id}${index + 1}`,
      })),
    )
  },

  async syncFixtures() {
    return groups.flatMap((group) => {
      const [a, b, c, d] = group.teams
      return [
        [a, b, 'group-opener'],
        [c, d, 'group-opener'],
        [a, c, 'matchday-2'],
        [b, d, 'matchday-2'],
        [a, d, 'final-group-match'],
        [b, c, 'final-group-match'],
      ].map(([home, away, slot], index) => ({
        provider: 'mock',
        providerFixtureId: `${group.id}-${index + 1}`,
        stage: `Group ${group.id}`,
        groupCode: group.id,
        homeTeamName: home,
        awayTeamName: away,
        status: 'scheduled',
        slot,
      }))
    })
  },

  async syncStandings() {
    return groups.map((group) => ({ groupCode: group.id, teams: group.teams }))
  },

  async syncResults() {
    return []
  },
}
