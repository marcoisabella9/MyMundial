const STORAGE_KEY = 'mymundial.localBeta.v1'

const defaultProfile = {
  id: 'local-user',
  displayName: 'Alex',
  email: 'alex@mymundial.test',
  favoriteTeam: 'Mexico',
}

const defaultLeague = {
  id: 'local-league',
  name: "Marco's bracket room",
  inviteCode: 'MYMUNDIAL26',
  members: [
    { id: 'local-user', displayName: 'Alex', role: 'owner', points: 0 },
    { id: 'maya', displayName: 'Maya', role: 'member', points: 0 },
    { id: 'sam', displayName: 'Sam', role: 'member', points: 0 },
  ],
  activity: [
    { id: 'seed-1', text: 'League created for World Cup 2026 predictions.', createdAt: new Date().toISOString() },
  ],
}

function readState() {
  if (typeof window === 'undefined') return createDefaultState()
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? { ...createDefaultState(), ...JSON.parse(stored) } : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

function writeState(nextState) {
  if (typeof window === 'undefined') return nextState
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
  return nextState
}

function createDefaultState() {
  return {
    profile: defaultProfile,
    league: defaultLeague,
    groupScores: null,
    bracketScores: {},
    predictions: {},
    lastSavedAt: null,
  }
}

function predictionKey(userId, contextId) {
  return `${userId}:${contextId}`
}

function summarizePrediction(prediction) {
  return `${prediction.homeTeam} ${prediction.predictedHomeScore}-${prediction.predictedAwayScore} ${prediction.awayTeam}`
}

export const betaStore = {
  loadProfile() {
    return readState().profile
  },

  saveProfile(profile) {
    const state = readState()
    const nextProfile = {
      ...state.profile,
      ...profile,
      displayName: profile.displayName?.trim() || state.profile.displayName,
      email: profile.email?.trim() || state.profile.email,
    }
    const nextLeague = {
      ...state.league,
      members: state.league.members.map((member) =>
        member.id === nextProfile.id ? { ...member, displayName: nextProfile.displayName } : member,
      ),
    }
    writeState({ ...state, profile: nextProfile, league: nextLeague })
    return nextProfile
  },

  loadLeague() {
    return readState().league
  },

  createLeague(name, profile) {
    const state = readState()
    const inviteCode = `${(name || 'MYMUNDIAL').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase() || 'MYMUND'}26`
    const league = {
      id: `league-${Date.now()}`,
      name: name?.trim() || 'MyMundial private league',
      inviteCode,
      members: [{ id: profile.id, displayName: profile.displayName, role: 'owner', points: 0 }],
      activity: [{
        id: `activity-${Date.now()}`,
        text: `${profile.displayName} created ${name?.trim() || 'a private league'}.`,
        createdAt: new Date().toISOString(),
      }],
    }
    writeState({ ...state, league })
    return league
  },

  joinLeague(inviteCode, profile) {
    const state = readState()
    const alreadyMember = state.league.members.some((member) => member.id === profile.id)
    const league = {
      ...state.league,
      members: alreadyMember
        ? state.league.members
        : [...state.league.members, { id: profile.id, displayName: profile.displayName, role: 'member', points: 0 }],
      activity: [
        {
          id: `activity-${Date.now()}`,
          text: `${profile.displayName} joined with code ${inviteCode || state.league.inviteCode}.`,
          createdAt: new Date().toISOString(),
        },
        ...state.league.activity,
      ],
    }
    writeState({ ...state, league })
    return league
  },

  loadGroupScores(defaultScores) {
    return readState().groupScores ?? defaultScores
  },

  saveGroupScores(groupScores) {
    const state = readState()
    writeState({ ...state, groupScores })
  },

  loadBracketScores() {
    return readState().bracketScores ?? {}
  },

  saveBracketScores(bracketScores) {
    const state = readState()
    writeState({ ...state, bracketScores })
  },

  savePrediction({ profile, context, score, locked }) {
    const state = readState()
    const now = new Date().toISOString()
    const prediction = {
      id: predictionKey(profile.id, context.id),
      userId: profile.id,
      fixtureId: context.id,
      fixtureType: context.type,
      stage: context.stage,
      homeTeam: context.home,
      awayTeam: context.away,
      predictedHomeScore: score.homeScore,
      predictedAwayScore: score.awayScore,
      lockedAt: locked ? now : null,
      updatedAt: now,
      resultState: locked ? 'locked' : 'draft',
    }
    const league = {
      ...state.league,
      activity: [
        {
          id: `activity-${Date.now()}`,
          text: `${profile.displayName} saved ${summarizePrediction(prediction)}.`,
          createdAt: now,
        },
        ...state.league.activity.slice(0, 7),
      ],
    }
    writeState({
      ...state,
      league,
      predictions: { ...state.predictions, [prediction.id]: prediction },
      lastSavedAt: now,
    })
    return prediction
  },

  loadPredictions() {
    return Object.values(readState().predictions ?? {})
  },

  countPredictions() {
    return this.loadPredictions().length
  },

  lastSavedAt() {
    return readState().lastSavedAt
  },
}
