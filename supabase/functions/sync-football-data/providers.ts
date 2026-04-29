type NormalizedItem = Record<string, unknown>;

type Provider = {
  name: "sportmonks" | "api-football";
  sync: (resource: string) => Promise<NormalizedItem[]>;
};

export function createSportmonksProvider(apiToken: string): Provider {
  return {
    name: "sportmonks",
    async sync(resource) {
      requireToken(apiToken, "SPORTMONKS_API_TOKEN");
      const baseUrl = "https://api.sportmonks.com/v3/football";
      const includesByResource: Record<string, string> = {
        fixtures: "participants;scores;state;venue",
        standings: "standings.participant",
        results: "participants;scores;state;venue",
        teams: "participants",
      };
      const include = includesByResource[resource] ?? includesByResource.fixtures;
      const response = await fetch(`${baseUrl}/fixtures?include=${include}&api_token=${apiToken}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message ?? "Sportmonks request failed");
      return Array.isArray(payload?.data) ? payload.data.map(normalizeSportmonksFixture) : [];
    },
  };
}

export function createApiFootballProvider(apiKey: string): Provider {
  return {
    name: "api-football",
    async sync(resource) {
      requireToken(apiKey, "APIFOOTBALL_API_KEY");
      const baseUrl = "https://v3.football.api-sports.io";
      const endpoints: Record<string, string> = {
        fixtures: "/fixtures?league=1&season=2026",
        standings: "/standings?league=1&season=2026",
        results: "/fixtures?league=1&season=2026&status=FT",
        teams: "/teams?league=1&season=2026",
      };
      const response = await fetch(`${baseUrl}${endpoints[resource] ?? endpoints.fixtures}`, {
        headers: { "x-apisports-key": apiKey },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message ?? "API-FOOTBALL request failed");
      return Array.isArray(payload?.response) ? payload.response.map(normalizeApiFootballFixture) : [];
    },
  };
}

function requireToken(value: string, name: string) {
  if (!value) throw new Error(`Missing ${name}`);
}

function normalizeSportmonksFixture(item: Record<string, unknown>): NormalizedItem {
  return {
    provider: "sportmonks",
    providerFixtureId: String(item.id ?? ""),
    raw: item,
  };
}

function normalizeApiFootballFixture(item: Record<string, unknown>): NormalizedItem {
  return {
    provider: "api-football",
    providerFixtureId: String((item.fixture as { id?: number } | undefined)?.id ?? ""),
    raw: item,
  };
}
