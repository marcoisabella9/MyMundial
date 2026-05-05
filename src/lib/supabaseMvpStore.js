import { supabase } from './supabaseClient'

function profileFromUser(user, fallbackProfile = {}) {
  const email = user?.email ?? fallbackProfile.email ?? ''
  return {
    id: user?.id ?? fallbackProfile.id,
    displayName:
      user?.user_metadata?.display_name
      ?? fallbackProfile.displayName
      ?? email.split('@')[0]
      ?? 'MyMundial user',
    email,
    favoriteTeam: fallbackProfile.favoriteTeam ?? 'Mexico',
  }
}

function rowToProfile(row, user, fallbackProfile) {
  if (!row) return profileFromUser(user, fallbackProfile)
  return {
    id: row.id,
    displayName: row.display_name,
    email: row.email ?? user?.email ?? '',
    favoriteTeam: fallbackProfile?.favoriteTeam ?? 'Mexico',
  }
}

function inviteFromName(name) {
  const base = (name || 'MYMUNDIAL').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()
  return `${base || 'MYMUND'}${Math.floor(1000 + Math.random() * 9000)}`
}

function summarizePrediction(prediction) {
  const score = `${prediction.homeTeam} ${prediction.predictedHomeScore}-${prediction.predictedAwayScore} ${prediction.awayTeam}`
  return prediction.advancingTeam ? `${score}, ${prediction.advancingTeam} advances` : score
}

const MATCH_DRAFT_POINTS = 160
const AWARD_DRAFT_POINTS = {
  potm: 160,
  boot: 120,
  glove: 80,
  young: 80,
}

const RESULT_POINTS = {
  outcome: 100,
  exact: 40,
  goalDifference: 20,
}

function draftPointsForPrediction(prediction) {
  const isKnockoutTieWithoutAdvancer =
    prediction.fixture_type === 'bracket'
    && prediction.predicted_home_score === prediction.predicted_away_score
    && !prediction.advancing_team
  return isKnockoutTieWithoutAdvancer ? 0 : MATCH_DRAFT_POINTS
}

function draftPointsForAward(awardPick) {
  return AWARD_DRAFT_POINTS[awardPick.award_key] ?? 0
}

function predictionRow({ profile, context, score, locked }) {
  const advancingTeam = score.advancerTeam
    ?? (score.homeScore > score.awayScore ? context.home : score.homeScore < score.awayScore ? context.away : null)
  return {
    user_id: profile.id,
    fixture_key: context.id,
    fixture_type: context.type,
    stage: context.stage,
    home_team: context.home,
    away_team: context.away,
    predicted_home_score: score.homeScore,
    predicted_away_score: score.awayScore,
    advancing_team: advancingTeam,
    locked_at: locked ? new Date().toISOString() : null,
    result_state: locked ? 'locked' : 'draft',
  }
}

function predictionFromRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    fixtureId: row.fixture_key,
    fixtureType: row.fixture_type,
    stage: row.stage,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    predictedHomeScore: row.predicted_home_score,
    predictedAwayScore: row.predicted_away_score,
    advancingTeam: row.advancing_team,
    lockedAt: row.locked_at,
    updatedAt: row.updated_at,
    resultState: row.result_state,
  }
}

function awardPickFromRow(row) {
  return {
    awardKey: row.award_key,
    awardLabel: row.award_label,
    recipient: row.recipient,
    lockedAt: row.locked_at,
    resultState: row.result_state,
    updatedAt: row.updated_at,
  }
}

function fixtureResultFromRow(row) {
  return {
    fixtureKey: row.fixture_key,
    fixtureType: row.fixture_type,
    stage: row.stage,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    homeScore: row.home_score,
    awayScore: row.away_score,
    advancingTeam: row.advancing_team,
    status: row.status,
    source: row.source,
    settledAt: row.settled_at,
    updatedAt: row.updated_at,
  }
}

function awardResultFromRow(row) {
  return {
    awardKey: row.award_key,
    awardLabel: row.award_label,
    recipient: row.recipient,
    source: row.source,
    settledAt: row.settled_at,
    updatedAt: row.updated_at,
  }
}

function activityFromRow(item) {
  return {
    id: item.id,
    actorId: item.actor_id,
    type: item.activity_type,
    metadata: item.metadata ?? {},
    text: activityText(item),
    createdAt: item.created_at,
  }
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function isMissingResultTableError(error) {
  const message = String(error?.message ?? '')
  return ['42P01', 'PGRST205'].includes(error?.code)
    || message.includes('mvp_fixture_results')
    || message.includes('mvp_award_results')
}

function outcomeFor(homeScore, awayScore, homeTeam, awayTeam, advancingTeam, fixtureType) {
  if (fixtureType === 'bracket' && homeScore === awayScore) return advancingTeam ?? null
  if (homeScore === awayScore) return 'draw'
  return homeScore > awayScore ? homeTeam : awayTeam
}

function settlementForPrediction(prediction, result) {
  if (!result) return { points: draftPointsForPrediction(prediction), mode: 'draft' }
  const predictionOutcome = outcomeFor(
    prediction.predicted_home_score,
    prediction.predicted_away_score,
    prediction.home_team,
    prediction.away_team,
    prediction.advancing_team,
    prediction.fixture_type,
  )
  const resultOutcome = outcomeFor(
    result.home_score,
    result.away_score,
    result.home_team,
    result.away_team,
    result.advancing_team,
    result.fixture_type,
  )
  const outcomeCorrect = predictionOutcome && resultOutcome && predictionOutcome === resultOutcome
  const exactCorrect = prediction.predicted_home_score === result.home_score
    && prediction.predicted_away_score === result.away_score
  const goalDifferenceCorrect =
    prediction.predicted_home_score - prediction.predicted_away_score === result.home_score - result.away_score
  const points =
    (outcomeCorrect ? RESULT_POINTS.outcome : 0)
    + (exactCorrect ? RESULT_POINTS.exact : 0)
    + (goalDifferenceCorrect ? RESULT_POINTS.goalDifference : 0)
  return {
    points,
    mode: 'settled',
    breakdown: { outcomeCorrect, exactCorrect, goalDifferenceCorrect },
  }
}

function settlementForAward(awardPick, result) {
  if (!result) return { points: draftPointsForAward(awardPick), mode: 'draft' }
  const correct = normalizeText(awardPick.recipient) === normalizeText(result.recipient)
  return { points: correct ? draftPointsForAward(awardPick) : 0, mode: 'settled', breakdown: { correct } }
}

function leagueFromRows(league, members = [], activity = [], predictions = [], awardPicks = [], fixtureResults = [], awardResults = []) {
  if (!league) return null
  const fixtureResultByKey = Object.fromEntries(fixtureResults.map((result) => [result.fixture_key, result]))
  const awardResultByKey = Object.fromEntries(awardResults.map((result) => [result.award_key, result]))
  const hasSettledResults = fixtureResults.length > 0 || awardResults.length > 0
  const rawActivityStats = activity.reduce((stats, item) => {
    if (item.activity_type !== 'prediction_saved' || !item.actor_id) return stats
    const summary = String(item.metadata?.summary ?? '')
    const bulkMatch = summary.match(/(\d+)\s+predictions/i)
    const current = stats[item.actor_id] ?? { bulkCount: 0, fixtureKeys: new Set(), lastSavedAt: null }
    if (bulkMatch) {
      current.bulkCount = Math.max(current.bulkCount, Number(bulkMatch[1]))
    } else if (item.metadata?.fixture_key) {
      current.fixtureKeys.add(item.metadata.fixture_key)
    } else if (summary) {
      current.fixtureKeys.add(item.id)
    }
    stats[item.actor_id] = {
      ...current,
      lastSavedAt: [current.lastSavedAt, item.created_at].filter(Boolean).sort().at(-1) ?? null,
    }
    return stats
  }, {})
  const activityStats = Object.fromEntries(
    Object.entries(rawActivityStats).map(([userId, stats]) => {
      const predictionCount = Math.max(stats.bulkCount, stats.fixtureKeys.size)
      return [
        userId,
        {
          predictionCount,
          lastSavedAt: stats.lastSavedAt,
          points: predictionCount * MATCH_DRAFT_POINTS,
        },
      ]
    }),
  )
  const predictionStats = predictions.reduce((stats, prediction) => {
    const current = stats[prediction.user_id] ?? { predictionCount: 0, settledCount: 0, lastSavedAt: null, points: 0 }
    const settlement = settlementForPrediction(prediction, fixtureResultByKey[prediction.fixture_key])
    stats[prediction.user_id] = {
      predictionCount: current.predictionCount + 1,
      settledCount: current.settledCount + (settlement.mode === 'settled' ? 1 : 0),
      lastSavedAt: [current.lastSavedAt, prediction.updated_at].filter(Boolean).sort().at(-1) ?? null,
      points: current.points + settlement.points,
    }
    return stats
  }, {})
  const awardStats = awardPicks.reduce((stats, awardPick) => {
    const current = stats[awardPick.user_id] ?? { awardCount: 0, settledCount: 0, lastSavedAt: null, points: 0 }
    const settlement = settlementForAward(awardPick, awardResultByKey[awardPick.award_key])
    stats[awardPick.user_id] = {
      awardCount: current.awardCount + 1,
      settledCount: current.settledCount + (settlement.mode === 'settled' ? 1 : 0),
      lastSavedAt: [current.lastSavedAt, awardPick.updated_at].filter(Boolean).sort().at(-1) ?? null,
      points: current.points + settlement.points,
    }
    return stats
  }, {})
  return {
    id: league.id,
    name: league.name,
    inviteCode: league.invite_code,
    createdAt: league.created_at,
    scoringMode: hasSettledResults ? 'settled' : 'draft',
    settledFixtureCount: fixtureResults.length,
    settledAwardCount: awardResults.length,
    members: members.map((member) => ({
      id: member.user_id,
      displayName: member.profiles?.display_name ?? 'Member',
      role: member.role,
      points: (predictionStats[member.user_id]?.points ?? activityStats[member.user_id]?.points ?? 0) + (awardStats[member.user_id]?.points ?? 0),
      predictionCount: predictionStats[member.user_id]?.predictionCount ?? activityStats[member.user_id]?.predictionCount ?? 0,
      settledPredictionCount: predictionStats[member.user_id]?.settledCount ?? 0,
      awardCount: awardStats[member.user_id]?.awardCount ?? 0,
      settledAwardCount: awardStats[member.user_id]?.settledCount ?? 0,
      predictions: predictions
        .filter((prediction) => prediction.user_id === member.user_id)
        .map(predictionFromRow),
      awardPicks: awardPicks
        .filter((awardPick) => awardPick.user_id === member.user_id)
        .map(awardPickFromRow),
      activity: activity
        .filter((item) => item.actor_id === member.user_id)
        .map(activityFromRow),
      lastSavedAt: [
        predictionStats[member.user_id]?.lastSavedAt,
        activityStats[member.user_id]?.lastSavedAt,
        awardStats[member.user_id]?.lastSavedAt,
      ].filter(Boolean).sort().at(-1) ?? null,
    })),
    activity: activity.map(activityFromRow),
  }
}

function activityText(item) {
  const actor = item.profiles?.display_name ?? 'A member'
  if (item.activity_type === 'created') return `${actor} created this league.`
  if (item.activity_type === 'joined') return `${actor} joined the league.`
  if (item.activity_type === 'prediction_saved') {
    return `${actor} saved ${item.metadata?.summary ?? 'a prediction'}.`
  }
  if (item.activity_type === 'league_updated') return `${actor} updated the league.`
  return `${actor} updated the league.`
}

async function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export const supabaseMvpStore = {
  async signIn(email, password) {
    const client = await requireClient()
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data.session
  },

  async signUp(email, password, displayName) {
    const client = await requireClient()
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error
    if (data.user && data.session) await this.ensureProfile(data.user, { displayName, email })
    return data.session
  },

  async signOut() {
    const client = await requireClient()
    const { error } = await client.auth.signOut()
    if (error) throw error
  },

  async ensureProfile(user, fallbackProfile) {
    const client = await requireClient()
    const fallback = profileFromUser(user, fallbackProfile)
    const { data: existing, error: existingError } = await client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (existingError) throw existingError
    const metadataName = user?.user_metadata?.display_name?.trim()
    if (existing) {
      const shouldRepairLegacyName = metadataName && ['Alex', 'Guest'].includes(existing.display_name) && existing.display_name !== metadataName
      if (!shouldRepairLegacyName) return rowToProfile(existing, user, fallback)
      const { data: repaired, error: repairError } = await client
        .from('profiles')
        .update({ display_name: metadataName })
        .eq('id', user.id)
        .select()
        .single()
      if (repairError) throw repairError
      return rowToProfile(repaired, user, fallback)
    }

    const { data, error } = await client
      .from('profiles').insert({
        id: user.id,
        display_name: fallback.displayName,
        email: fallback.email,
      })
      .select()
      .single()
    if (error) throw error
    return rowToProfile(data, user, fallback)
  },

  async saveProfile(user, profile) {
    const client = await requireClient()
    const { data, error } = await client
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: profile.displayName?.trim() || 'MyMundial user',
        email: profile.email?.trim() || user.email,
      }, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return rowToProfile(data, user, profile)
  },

  async loadProfile(user, fallbackProfile) {
    const client = await requireClient()
    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (error) throw error
    return data ? rowToProfile(data, user, fallbackProfile) : this.ensureProfile(user, fallbackProfile)
  },

  async loadLeague(user) {
    const client = await requireClient()
    const { data: membership, error: membershipError } = await client
      .from('league_members')
      .select('league_id')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (membershipError) throw membershipError
    if (!membership) return null

    const { data: league, error: leagueError } = await client
      .from('leagues')
      .select('*')
      .eq('id', membership.league_id)
      .single()
    if (leagueError) throw leagueError

    const { data: members, error: membersError } = await client
      .from('league_members')
      .select('user_id, role, profiles(display_name)')
      .eq('league_id', league.id)
      .order('joined_at', { ascending: true })
    if (membersError) throw membersError

    const { data: activity, error: activityError } = await client
      .from('league_activity')
      .select('id, actor_id, activity_type, metadata, created_at, profiles(display_name)')
      .eq('league_id', league.id)
      .order('created_at', { ascending: false })
      .limit(200)
    if (activityError) throw activityError

    const memberIds = members.map((member) => member.user_id)
    let predictions = []
    let awardPicks = []
    let fixtureResults = []
    let awardResults = []
    if (memberIds.length) {
      const { data: predictionRows, error: predictionError } = await client
        .from('mvp_prediction_drafts')
        .select('*')
        .in('user_id', memberIds)
        .order('updated_at', { ascending: false })
      if (!predictionError) predictions = predictionRows

      const { data: awardRows, error: awardError } = await client
        .from('mvp_award_picks')
        .select('*')
        .in('user_id', memberIds)
        .order('updated_at', { ascending: false })
      if (!awardError) awardPicks = awardRows
    }

    const { data: fixtureResultRows, error: fixtureResultError } = await client
      .from('mvp_fixture_results')
      .select('*')
    if (!fixtureResultError) fixtureResults = fixtureResultRows

    const { data: awardResultRows, error: awardResultError } = await client
      .from('mvp_award_results')
      .select('*')
    if (!awardResultError) awardResults = awardResultRows

    return leagueFromRows(league, members, activity, predictions, awardPicks, fixtureResults, awardResults)
  },

  async loadAdminStatus(user) {
    const client = await requireClient()
    const { data, error } = await client
      .from('app_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return false
    return Boolean(data)
  },

  async loadResults() {
    const client = await requireClient()
    const [{ data: fixtureRows, error: fixtureError }, { data: awardRows, error: awardError }] = await Promise.all([
      client.from('mvp_fixture_results').select('*').order('updated_at', { ascending: false }),
      client.from('mvp_award_results').select('*').order('updated_at', { ascending: false }),
    ])
    if (isMissingResultTableError(fixtureError) || isMissingResultTableError(awardError)) {
      return { fixtures: {}, awards: {} }
    }
    if (fixtureError) throw fixtureError
    if (awardError) throw awardError
    return {
      fixtures: Object.fromEntries(fixtureRows.map((row) => [row.fixture_key, fixtureResultFromRow(row)])),
      awards: Object.fromEntries(awardRows.map((row) => [row.award_key, awardResultFromRow(row)])),
    }
  },

  async saveFixtureResult({ context, result }) {
    const client = await requireClient()
    const { data, error } = await client
      .from('mvp_fixture_results')
      .upsert({
        fixture_key: context.id,
        fixture_type: context.type,
        stage: context.stage,
        home_team: context.home,
        away_team: context.away,
        home_score: result.homeScore,
        away_score: result.awayScore,
        advancing_team: result.advancerTeam ?? (
          context.type === 'bracket'
            ? result.homeScore > result.awayScore
              ? context.home
              : result.homeScore < result.awayScore
                ? context.away
                : null
            : null
        ),
        status: 'final',
        source: 'manual',
        settled_at: new Date().toISOString(),
      }, { onConflict: 'fixture_key' })
      .select()
      .single()
    if (error) throw error
    return fixtureResultFromRow(data)
  },

  async saveAwardResult({ award, recipient }) {
    const client = await requireClient()
    const { data, error } = await client
      .from('mvp_award_results')
      .upsert({
        award_key: award.id,
        award_label: award.label,
        recipient,
        source: 'manual',
        settled_at: new Date().toISOString(),
      }, { onConflict: 'award_key' })
      .select()
      .single()
    if (error) throw error
    return awardResultFromRow(data)
  },

  async createLeague(name, profile, user) {
    const client = await requireClient()
    const inviteCode = inviteFromName(name)
    const { data: league, error: leagueError } = await client
      .from('leagues')
      .insert({
        owner_id: user.id,
        name: name?.trim() || 'MyMundial private league',
        invite_code: inviteCode,
      })
      .select()
      .single()
    if (leagueError) throw leagueError

    const { error: memberError } = await client.from('league_members').insert({
      league_id: league.id,
      user_id: user.id,
      role: 'owner',
    })
    if (memberError) throw memberError

    await client.from('league_activity').insert({
      league_id: league.id,
      actor_id: user.id,
      activity_type: 'created',
      metadata: { name: league.name, display_name: profile.displayName },
    })

    return this.loadLeague(user)
  },

  async updateLeagueName(league, name, user) {
    const client = await requireClient()
    const nextName = name?.trim()
    if (!nextName) throw new Error('Enter a league name.')
    const { error } = await client
      .from('leagues')
      .update({ name: nextName })
      .eq('id', league.id)
    if (error) throw error

    await client.from('league_activity').insert({
      league_id: league.id,
      actor_id: user.id,
      activity_type: 'league_updated',
      metadata: { name: nextName },
    })

    return this.loadLeague(user)
  },

  async joinLeague(inviteCode, user) {
    const client = await requireClient()
    const { error } = await client.rpc('join_league_by_invite', { target_invite_code: inviteCode })
    if (error) throw error
    return this.loadLeague(user)
  },

  async savePrediction({ profile, context, score, locked, league }) {
    const client = await requireClient()
    const { data, error } = await client
      .from('mvp_prediction_drafts')
      .upsert(predictionRow({ profile, context, score, locked }), { onConflict: 'user_id,fixture_key' })
      .select()
      .single()
    if (error) throw error

    const prediction = predictionFromRow(data)
    if (league?.id) {
      await client.from('league_activity').insert({
        league_id: league.id,
        actor_id: profile.id,
        activity_type: 'prediction_saved',
        metadata: { fixture_key: context.id, summary: summarizePrediction(prediction) },
      })
    }
    return prediction
  },

  async savePredictions({ profile, items, locked = false, league }) {
    if (!items.length) return []
    const client = await requireClient()
    const rows = items.map((item) => predictionRow({ profile, context: item.context, score: item.score, locked }))
    const { data, error } = await client
      .from('mvp_prediction_drafts')
      .upsert(rows, { onConflict: 'user_id,fixture_key' })
      .select()
    if (error) throw error

    const predictions = data.map(predictionFromRow)
    if (league?.id) {
      await client.from('league_activity').insert({
        league_id: league.id,
        actor_id: profile.id,
        activity_type: 'prediction_saved',
        metadata: { summary: `${predictions.length} predictions` },
      })
    }
    return predictions
  },

  async loadPredictions(user) {
    const client = await requireClient()
    const { data, error } = await client
      .from('mvp_prediction_drafts')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data.map(predictionFromRow)
  },

  async loadAwardPicks(user) {
    const client = await requireClient()
    const { data, error } = await client
      .from('mvp_award_picks')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return Object.fromEntries(data.map((row) => [row.award_key, awardPickFromRow(row)]))
  },

  async saveAwardPick({ profile, award, recipient, locked = false }) {
    const client = await requireClient()
    const { data, error } = await client
      .from('mvp_award_picks')
      .upsert({
        user_id: profile.id,
        award_key: award.id,
        award_label: award.label,
        recipient,
        locked_at: locked ? new Date().toISOString() : null,
        result_state: locked ? 'locked' : 'draft',
      }, { onConflict: 'user_id,award_key' })
      .select()
      .single()
    if (error) throw error
    return awardPickFromRow(data)
  },
}
