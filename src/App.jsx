import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardCheck,
  CircleHelp,
  CircleMinus,
  CirclePlus,
  Copy,
  Eye,
  Info,
  Medal,
  Moon,
  Radio,
  Save,
  Sparkles,
  Sun,
  UserRound,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import { awardCandidateCatalog, awards, groupMatchEvents, groups, liveEvents, teamMeta } from './data'
import { hasSupabaseConfig } from './lib/config'
import { supabase } from './lib/supabaseClient'
import { supabaseMvpStore } from './lib/supabaseMvpStore'

const navItems = [
  { id: 'groups', label: 'Groups', icon: BarChart3 },
  { id: 'bracket', label: 'Bracket', icon: Trophy },
  { id: 'match', label: 'Match', icon: Radio },
  { id: 'leagues', label: 'Leagues', icon: Users },
  { id: 'awards', label: 'Awards', icon: Medal },
]

const adminNavItem = { id: 'results', label: 'Results', icon: ClipboardCheck }

const viewTitles = {
  groups: 'Group Stage',
  bracket: 'Bracket Stage',
  match: 'Match Pick',
  leagues: 'Leagues',
  awards: 'Awards',
}

function initialView() {
  if (typeof window === 'undefined') return 'groups'
  return new URLSearchParams(window.location.search).get('invite') ? 'leagues' : 'groups'
}

function initialTheme() {
  if (typeof window === 'undefined') return 'dark'
  return window.localStorage.getItem('mymundial-theme') ?? 'dark'
}

function initialInviteCode() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('invite') ?? ''
}

function scrollToTop() {
  requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
}

const flagCodes = {
  Mexico: 'mx', 'South Africa': 'za', 'South Korea': 'kr', Czechia: 'cz',
  Canada: 'ca', 'Bosnia and Herzegovina': 'ba', Qatar: 'qa', Switzerland: 'ch',
  Brazil: 'br', Morocco: 'ma', Haiti: 'ht', Scotland: 'gb-sct',
  'United States': 'us', Paraguay: 'py', Australia: 'au', Turkiye: 'tr',
  Germany: 'de', Curacao: 'cw', 'Ivory Coast': 'ci', Ecuador: 'ec',
  Netherlands: 'nl', Japan: 'jp', Sweden: 'se', Tunisia: 'tn',
  Belgium: 'be', Egypt: 'eg', Iran: 'ir', 'New Zealand': 'nz',
  Spain: 'es', 'Cape Verde': 'cv', 'Saudi Arabia': 'sa', Uruguay: 'uy',
  France: 'fr', Senegal: 'sn', Norway: 'no', Iraq: 'iq',
  Argentina: 'ar', Algeria: 'dz', Austria: 'at', Jordan: 'jo',
  Portugal: 'pt', 'DR Congo': 'cd', Uzbekistan: 'uz', Colombia: 'co',
  England: 'gb-eng', Croatia: 'hr', Ghana: 'gh', Panama: 'pa',
}

const groupMatchups = groups.flatMap((group) => {
  const [a, b, c, d] = group.teams
  return [
    [a, b, 'Jun 11'], [c, d, 'Jun 12'], [a, c, 'Jun 17'],
    [b, d, 'Jun 18'], [a, d, 'Jun 23'], [b, c, 'Jun 23'],
  ].map(([home, away, date], index) => ({
    id: `${group.id}-${index + 1}`,
    group: group.id,
    home,
    away,
    date,
    venue: index < 2 ? 'Group opener' : index < 4 ? 'Matchday 2' : 'Final group match',
  }))
})

const GROUP_LOCK_AT_BY_DATE = {
  'Jun 11': '2026-06-11T15:00:00-04:00',
  'Jun 12': '2026-06-12T15:00:00-04:00',
  'Jun 17': '2026-06-17T15:00:00-04:00',
  'Jun 18': '2026-06-18T15:00:00-04:00',
  'Jun 23': '2026-06-23T15:00:00-04:00',
}

const KNOCKOUT_LOCK_AT_BY_STAGE = {
  R32: '2026-07-03T12:00:00-04:00',
  R16: '2026-07-09T12:00:00-04:00',
  QF: '2026-07-13T12:00:00-04:00',
  SF: '2026-07-14T15:00:00-04:00',
  Final: '2026-07-19T15:00:00-04:00',
  '3rd Place': '2026-07-18T15:00:00-04:00',
}

const AWARD_LOCK_AT = '2026-06-11T15:00:00-04:00'

function isLockedAt(lockAt) {
  if (!lockAt) return false
  return Date.now() >= new Date(lockAt).getTime()
}

function lockText(lockAt) {
  if (!lockAt) return 'Prediction open'
  if (isLockedAt(lockAt)) return 'Locked'
  return 'Prediction open'
}

function groupLockAt(match) {
  return GROUP_LOCK_AT_BY_DATE[match.date]
}

function knockoutLockAt(stage) {
  return KNOCKOUT_LOCK_AT_BY_STAGE[stage]
}

const initialGroupScores = Object.fromEntries(
  groupMatchups.map((match) => [
    match.id,
    {
      home: match.home,
      away: match.away,
      homeScore: 0,
      awayScore: 0,
      touched: false,
    },
  ]),
)

const awardSearchMeta = {
  potm: {
    placeholder: 'Search any player or type a custom name',
    helper: 'Broad player pool. Custom names are allowed for V1 settlement.',
    customLabel: 'Use player name',
  },
  boot: {
    placeholder: 'Search goal scorers or type a custom name',
    helper: 'Forwards and attacking mids are surfaced first, but any player can be saved.',
    customLabel: 'Use scorer name',
  },
  glove: {
    placeholder: 'Search goalkeepers only',
    helper: 'Golden Glove is restricted to goalkeeper candidates. Missing keepers can be typed and reviewed at settlement.',
    customLabel: 'Use goalkeeper name',
    position: 'GK',
  },
  young: {
    placeholder: 'Search young players or type a custom name',
    helper: 'Young-player candidates are surfaced first. Custom names are allowed for V1 settlement.',
    customLabel: 'Use young player name',
  },
}

function hydrateScoresFromPredictions(predictions) {
  const groupScores = { ...initialGroupScores }
  const bracketScores = {}
  predictions.forEach((prediction) => {
    const score = {
      home: prediction.homeTeam,
      away: prediction.awayTeam,
      homeScore: prediction.predictedHomeScore,
      awayScore: prediction.predictedAwayScore,
      touched: true,
      ...(prediction.advancingTeam ? { advancerTeam: prediction.advancingTeam } : {}),
    }
    if (prediction.fixtureType === 'group' && groupScores[prediction.fixtureId]) {
      groupScores[prediction.fixtureId] = { ...groupScores[prediction.fixtureId], ...score }
    }
    if (prediction.fixtureType === 'bracket') {
      bracketScores[prediction.fixtureId] = score
    }
  })
  return { groupScores, bracketScores }
}

function latestPredictionTime(predictions) {
  const latest = predictions
    .map((prediction) => prediction.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1)
  return latest ?? null
}

function leagueInviteUrl(inviteCode) {
  if (!inviteCode || inviteCode === 'SIGNIN') return ''
  const baseUrl = typeof window === 'undefined' ? 'https://mymundial.vercel.app/' : window.location.origin + window.location.pathname
  return `${baseUrl}?invite=${encodeURIComponent(inviteCode)}`
}

function memberCompletion(member) {
  const savedPicks = (member.predictionCount ?? 0) + (member.awardCount ?? 0)
  const targetPicks = groupMatchups.length + 32 + awards.length
  return {
    savedPicks,
    targetPicks,
    points: member.points ?? 0,
    percent: Math.min(100, Math.round((savedPicks / targetPicks) * 100)),
  }
}

function emptyLeague() {
  return {
    id: 'no-league',
    name: 'Create or join a private league',
    inviteCode: '',
    members: [],
    activity: [],
  }
}

function blankProfile() {
  return {
    id: '',
    displayName: '',
    email: '',
    favoriteTeam: 'Mexico',
  }
}

function freshGroupScores() {
  return Object.fromEntries(
    Object.entries(initialGroupScores).map(([id, score]) => [id, { ...score }]),
  )
}

const defaultMatchContext = {
  id: 'A-1',
  type: 'group',
  stage: 'Group A',
  home: 'Mexico',
  away: 'South Africa',
  venue: 'Group opener',
  date: 'Jun 11 - prediction open',
  lockAt: GROUP_LOCK_AT_BY_DATE['Jun 11'],
  events: groupMatchEvents,
  backView: 'groups',
}

const roundOf32Template = [
  ['A1', ['C3', 'E3', 'F3', 'H3', 'I3']],
  ['B1', ['E3', 'F3', 'G3', 'I3', 'J3']],
  ['C1', ['D2']],
  ['D1', ['F3', 'I3', 'J3', 'K3', 'L3']],
  ['E1', ['A3', 'B3', 'C3', 'D3', 'F3']],
  ['F1', ['C2']],
  ['G1', ['H2']],
  ['H1', ['G2']],
  ['I1', ['A3', 'B3', 'C3', 'D3', 'E3']],
  ['J1', ['F2']],
  ['K1', ['L2']],
  ['L1', ['K2']],
  ['A2', ['B2']],
  ['D3', ['E2']],
  ['I2', ['J2']],
  ['K3', ['H3', 'I3', 'J3', 'L3']],
]

function meta(team) {
  return teamMeta[team] ?? { code: team.slice(0, 3).toUpperCase(), color: '#64748b' }
}

function TeamBadge({ team, seed }) {
  const item = meta(team)
  return (
    <span className="team-badge">
      <img className="team-flag" src={`https://flagcdn.com/w40/${flagCodes[team] ?? 'un'}.png`} alt="" style={{ '--flag-color': item.color }} />
      <span className="team-code">{item.code}</span>
      <span className="team-name">{team}</span>
      {seed && <span className="seed">{seed}</span>}
    </span>
  )
}

function TeamFlag({ team }) {
  const item = meta(team)
  return (
    <img
      className="team-flag compact-flag"
      src={`https://flagcdn.com/w40/${flagCodes[team] ?? 'un'}.png`}
      alt={item.code}
      title={`${item.code} ${team}`}
      style={{ '--flag-color': item.color }}
    />
  )
}

function blankStanding(team, groupId) {
  return { team, group: groupId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0, seededOrder: 0 }
}

function buildStandings(groupScores) {
  return Object.fromEntries(groups.map((group) => {
    const rows = Object.fromEntries(group.teams.map((team, index) => [team, { ...blankStanding(team, group.id), seededOrder: index }]))
    groupMatchups.filter((match) => match.group === group.id).forEach((match) => {
      const score = groupScores[match.id]
      if (!score.touched) return
      const home = rows[match.home]
      const away = rows[match.away]
      home.played += 1
      away.played += 1
      home.gf += score.homeScore
      home.ga += score.awayScore
      away.gf += score.awayScore
      away.ga += score.homeScore
      if (score.homeScore > score.awayScore) {
        home.won += 1
        away.lost += 1
        home.pts += 3
      } else if (score.homeScore < score.awayScore) {
        away.won += 1
        home.lost += 1
        away.pts += 3
      } else {
        home.drawn += 1
        away.drawn += 1
        home.pts += 1
        away.pts += 1
      }
    })
    const sorted = Object.values(rows)
      .map((row) => ({ ...row, gd: row.gf - row.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.seededOrder - b.seededOrder)
    return [group.id, sorted]
  }))
}

function App() {
  const [view, setView] = useState(initialView)
  const [session, setSession] = useState(null)
  const [authMode, setAuthMode] = useState('sign-in')
  const [authForm, setAuthForm] = useState({ displayName: '', email: '', password: '' })
  const [authStatus, setAuthStatus] = useState({ loading: Boolean(supabase), message: '', error: '' })
  const [saveStatus, setSaveStatus] = useState({ loading: false, message: 'Sign in to autosave picks.', error: '' })
  const [awardSaveStatus, setAwardSaveStatus] = useState({ loading: false, message: '', error: '' })
  const [leagueStatus, setLeagueStatus] = useState({ loading: false, message: '', error: '' })
  const [shareStatus, setShareStatus] = useState('')
  const [selectedLeagueMemberId, setSelectedLeagueMemberId] = useState(null)
  const [profile, setProfile] = useState(blankProfile)
  const [profileDraft, setProfileDraft] = useState(blankProfile)
  const [league, setLeague] = useState(emptyLeague)
  const [leagueName, setLeagueName] = useState('MyMundial private league')
  const [inviteCode, setInviteCode] = useState(initialInviteCode)
  const [predictionCount, setPredictionCount] = useState(0)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [groupScores, setGroupScores] = useState(freshGroupScores)
  const [bracketScores, setBracketScores] = useState({})
  const [selectedAward, setSelectedAward] = useState('potm')
  const [awardPicks, setAwardPicks] = useState({})
  const [fixtureResults, setFixtureResults] = useState({})
  const [awardResults, setAwardResults] = useState({})
  const [fixtureLocks, setFixtureLocks] = useState({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [resultStatus, setResultStatus] = useState({ loading: false, message: '', error: '' })
  const [matchContext, setMatchContext] = useState(defaultMatchContext)
  const [dirtyPick, setDirtyPick] = useState(null)
  const [theme, setTheme] = useState(initialTheme)
  const autosaveTimerRef = useRef(null)
  const currentUser = session?.user ?? null
  const isSignedIn = Boolean(currentUser)

  useEffect(() => {
    window.localStorage.setItem('mymundial-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!supabase) return undefined
    let isMounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        setAuthStatus({ loading: false, message: '', error: error.message })
        return
      }
      setSession(data.session)
      setAuthStatus((current) => ({ ...current, loading: false }))
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!currentUser) return
    let isMounted = true
    async function loadRemoteState() {
      setAuthStatus({ loading: true, message: 'Syncing your MyMundial account...', error: '' })
      try {
        const nextProfile = await supabaseMvpStore.ensureProfile(currentUser, profile)
        const [remotePredictions, remoteLeague, remoteAwardPicks, remoteIsAdmin, remoteResults] = await Promise.all([
          supabaseMvpStore.loadPredictions(currentUser),
          supabaseMvpStore.loadLeague(currentUser),
          supabaseMvpStore.loadAwardPicks(currentUser),
          supabaseMvpStore.loadAdminStatus(currentUser),
          supabaseMvpStore.loadResults(),
        ])
        if (!isMounted) return
        setProfile(nextProfile)
        setProfileDraft(nextProfile)
        setAuthForm((current) => ({
          ...current,
          displayName: nextProfile.displayName,
          email: nextProfile.email,
          password: '',
        }))
        if (remoteLeague) {
          setLeague(remoteLeague)
          setLeagueName(remoteLeague.name)
        } else {
          setLeague(emptyLeague())
          setLeagueName('MyMundial private league')
        }
        if (remotePredictions.length > 0) {
          const hydrated = hydrateScoresFromPredictions(remotePredictions)
          setGroupScores(hydrated.groupScores)
          setBracketScores(hydrated.bracketScores)
        }
        setPredictionCount(remotePredictions.length)
        setLastSavedAt(latestPredictionTime(remotePredictions))
        setAwardPicks(remoteAwardPicks)
        setIsAdmin(remoteIsAdmin)
        setFixtureResults(remoteResults.fixtures)
        setAwardResults(remoteResults.awards)
        setFixtureLocks(remoteResults.locks ?? {})
        setAuthStatus({
          loading: false,
          message: remotePredictions.length > 0 ? 'Synced saved picks from Supabase.' : 'Signed in. Picks will autosave.',
          error: '',
        })
        setSaveStatus({
          loading: false,
          message: 'Autosave is on.',
          error: '',
        })
      } catch (error) {
        if (!isMounted) return
        setAuthStatus({ loading: false, message: '', error: error.message })
      }
    }
    loadRemoteState()
    return () => {
      isMounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const standings = useMemo(() => buildStandings(groupScores), [groupScores])

  const predictedGroups = useMemo(() => new Set(
    groups
      .filter((group) => groupMatchups.some((match) => match.group === group.id && groupScores[match.id].touched))
      .map((group) => group.id),
  ), [groupScores])

  const qualifiers = useMemo(() => {
    const topTwo = groups.flatMap((group) =>
      standings[group.id].slice(0, 2).map((row, index) => ({
        team: row.team,
        seed: `${group.id}${index + 1}`,
        group: group.id,
        rank: index + 1,
      })),
    )
    const thirds = groups.map((group) => standings[group.id][2])
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
      .slice(0, 8)
      .map((row) => ({ team: row.team, seed: `${row.group}3`, group: row.group, rank: 3 }))
    return [...topTwo, ...thirds]
  }, [standings])

  const playableQualifierBySeed = useMemo(() => {
    const seedMap = new Map()
    qualifiers.forEach((slot) => {
      if (predictedGroups.has(slot.group)) seedMap.set(slot.seed, slot)
    })
    return seedMap
  }, [predictedGroups, qualifiers])

  const bracketRounds = useMemo(() => {
    function scoreFor(match, fallbackHome = 1, fallbackAway = 0) {
      if (!bracketScores[match.id]) return null
      return {
        home: match.a?.team,
        away: match.b?.team,
        homeScore: fallbackHome,
        awayScore: fallbackAway,
        ...bracketScores[match.id],
      }
    }

    function matchState(match) {
      const score = scoreFor(match, match.fallbackHome, match.fallbackAway)
      if (!score) return 'pending'
      if (score.homeScore === score.awayScore && !score.advancerTeam) return 'needs winner'
      return 'picked'
    }

    function winner(match, fallbackHome, fallbackAway) {
      const score = scoreFor(match, fallbackHome, fallbackAway)
      if (!match.a || !match.b || !score) return undefined
      if (score.homeScore === score.awayScore) {
        if (score.advancerTeam === match.a.team) return match.a
        if (score.advancerTeam === match.b.team) return match.b
        return undefined
      }
      return score.homeScore > score.awayScore ? match.a : match.b
    }

    function loser(match, fallbackHome, fallbackAway) {
      const picked = winner(match, fallbackHome, fallbackAway)
      if (!picked || !match.a || !match.b) return undefined
      return picked.team === match.a.team ? match.b : match.a
    }

    const usedSeeds = new Set()
    const pickSeed = (seedOrSeeds, opposingSlot) => {
      const seeds = Array.isArray(seedOrSeeds) ? seedOrSeeds : [seedOrSeeds]
      const available = seeds.find((seed) => playableQualifierBySeed.has(seed) && !usedSeeds.has(seed))
      if (available) {
        usedSeeds.add(available)
        return playableQualifierBySeed.get(available)
      }
      const fallback = [...playableQualifierBySeed.entries()].find(([seed, slot]) =>
        !usedSeeds.has(seed) && (!opposingSlot || slot.group !== opposingSlot.group),
      )
      if (!fallback) return undefined
      usedSeeds.add(fallback[0])
      return fallback[1]
    }

    const r32 = roundOf32Template.map(([homeSeed, awaySeeds], index) => {
      const homeSlot = pickSeed(homeSeed)
      const awaySlot = pickSeed(awaySeeds, homeSlot)
      return {
        id: `r32-${index}`,
        a: homeSlot,
        b: awaySlot,
        state: 'pending',
        fallbackHome: 0,
        fallbackAway: 0,
      }
    })
    r32.forEach((match) => { match.state = matchState(match) })
    r32.forEach((match) => { match.picked = winner(match, match.fallbackHome, match.fallbackAway) })
    const r16 = Array.from({ length: 8 }, (_, index) => ({
      id: `r16-${index}`,
      a: r32[index * 2]?.picked,
      b: r32[index * 2 + 1]?.picked,
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    r16.forEach((match) => { match.state = matchState(match) })
    r16.forEach((match) => { match.picked = winner(match, match.fallbackHome, match.fallbackAway) })
    const qf = Array.from({ length: 4 }, (_, index) => ({
      id: `qf-${index}`,
      a: r16[index * 2]?.picked,
      b: r16[index * 2 + 1]?.picked,
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    qf.forEach((match) => { match.state = matchState(match) })
    qf.forEach((match) => { match.picked = winner(match, match.fallbackHome, match.fallbackAway) })
    const sf = Array.from({ length: 2 }, (_, index) => ({
      id: `sf-${index}`,
      a: qf[index * 2]?.picked,
      b: qf[index * 2 + 1]?.picked,
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    sf.forEach((match) => { match.state = matchState(match) })
    sf.forEach((match) => { match.picked = winner(match, match.fallbackHome, match.fallbackAway) })
    const final = [{ id: 'final-0', label: 'Final', a: sf[0]?.picked, b: sf[1]?.picked, state: 'pending', fallbackHome: 0, fallbackAway: 0 }]
    final[0].state = matchState(final[0])
    final[0].picked = winner(final[0], 0, 0)
    const thirdPlace = [{
      id: 'third-0',
      label: '3rd Place',
      a: loser(sf[0], 0, 0),
      b: loser(sf[1], 0, 0),
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }]
    thirdPlace[0].state = matchState(thirdPlace[0])
    thirdPlace[0].picked = winner(thirdPlace[0], 0, 0)
    return [
      ['R32', r32],
      ['R16', r16],
      ['QF', qf],
      ['SF', sf],
      ['Finals', [...final, ...thirdPlace]],
    ]
  }, [playableQualifierBySeed, bracketScores])

  const groupMatchContexts = useMemo(() => groupMatchups.map((match) => ({
    id: match.id,
    type: 'group',
    stage: `Group ${match.group}`,
    home: match.home,
    away: match.away,
    venue: match.venue,
    date: `${match.date} - ${lockText(groupLockAt(match)).toLowerCase()}`,
    lockAt: groupLockAt(match),
    events: groupMatchEvents,
    backView: 'groups',
  })), [])

  const knockoutMatchContexts = useMemo(() => bracketRounds.flatMap(([round, matches]) =>
    matches
      .filter((match) => match.a?.team && match.b?.team)
      .map((match) => ({
        id: match.id,
        type: 'bracket',
        stage: match.label ?? round,
        home: match.a.team,
        away: match.b.team,
        venue: match.label === 'Final' ? 'New York New Jersey Stadium' : match.label === '3rd Place' ? 'Hard Rock Stadium' : 'Mercedes-Benz Stadium',
        date: `MVP schedule - ${lockText(knockoutLockAt(match.label ?? round)).toLowerCase()}`,
        lockAt: knockoutLockAt(match.label ?? round),
        events: liveEvents,
        backView: 'bracket',
        fallbackHome: match.fallbackHome,
        fallbackAway: match.fallbackAway,
      })),
  ), [bracketRounds])

  const resultBracketRounds = useMemo(() => {
    function resultScoreFor(match) {
      const result = fixtureResults[match.id]
      if (!result || !match.a || !match.b) return null
      if (result.homeTeam !== match.a.team || result.awayTeam !== match.b.team) return null
      return {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        advancerTeam: result.advancingTeam,
      }
    }

    function resultState(match) {
      const score = resultScoreFor(match)
      if (!score) return 'pending'
      if (score.homeScore === score.awayScore && !score.advancerTeam) return 'needs winner'
      return 'picked'
    }

    function officialWinner(match) {
      const score = resultScoreFor(match)
      if (!match.a || !match.b || !score) return undefined
      if (score.homeScore === score.awayScore) {
        if (score.advancerTeam === match.a.team) return match.a
        if (score.advancerTeam === match.b.team) return match.b
        return undefined
      }
      return score.homeScore > score.awayScore ? match.a : match.b
    }

    function officialLoser(match) {
      const picked = officialWinner(match)
      if (!picked || !match.a || !match.b) return undefined
      return picked.team === match.a.team ? match.b : match.a
    }

    const usedSeeds = new Set()
    const pickSeed = (seedOrSeeds, opposingSlot) => {
      const seeds = Array.isArray(seedOrSeeds) ? seedOrSeeds : [seedOrSeeds]
      const available = seeds.find((seed) => playableQualifierBySeed.has(seed) && !usedSeeds.has(seed))
      if (available) {
        usedSeeds.add(available)
        return playableQualifierBySeed.get(available)
      }
      const fallback = [...playableQualifierBySeed.entries()].find(([seed, slot]) =>
        !usedSeeds.has(seed) && (!opposingSlot || slot.group !== opposingSlot.group),
      )
      if (!fallback) return undefined
      usedSeeds.add(fallback[0])
      return fallback[1]
    }

    const r32 = roundOf32Template.map(([homeSeed, awaySeeds], index) => {
      const homeSlot = pickSeed(homeSeed)
      const awaySlot = pickSeed(awaySeeds, homeSlot)
      return { id: `r32-${index}`, a: homeSlot, b: awaySlot, state: 'pending', fallbackHome: 0, fallbackAway: 0 }
    })
    r32.forEach((match) => { match.state = resultState(match) })
    r32.forEach((match) => { match.picked = officialWinner(match) })
    const r16 = Array.from({ length: 8 }, (_, index) => ({
      id: `r16-${index}`,
      a: r32[index * 2]?.picked,
      b: r32[index * 2 + 1]?.picked,
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    r16.forEach((match) => { match.state = resultState(match) })
    r16.forEach((match) => { match.picked = officialWinner(match) })
    const qf = Array.from({ length: 4 }, (_, index) => ({
      id: `qf-${index}`,
      a: r16[index * 2]?.picked,
      b: r16[index * 2 + 1]?.picked,
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    qf.forEach((match) => { match.state = resultState(match) })
    qf.forEach((match) => { match.picked = officialWinner(match) })
    const sf = Array.from({ length: 2 }, (_, index) => ({
      id: `sf-${index}`,
      a: qf[index * 2]?.picked,
      b: qf[index * 2 + 1]?.picked,
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    sf.forEach((match) => { match.state = resultState(match) })
    sf.forEach((match) => { match.picked = officialWinner(match) })
    const final = [{ id: 'final-0', label: 'Final', a: sf[0]?.picked, b: sf[1]?.picked, state: 'pending', fallbackHome: 0, fallbackAway: 0 }]
    final[0].state = resultState(final[0])
    final[0].picked = officialWinner(final[0])
    const thirdPlace = [{
      id: 'third-0',
      label: '3rd Place',
      a: officialLoser(sf[0]),
      b: officialLoser(sf[1]),
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }]
    thirdPlace[0].state = resultState(thirdPlace[0])
    thirdPlace[0].picked = officialWinner(thirdPlace[0])
    return [
      ['R32', r32],
      ['R16', r16],
      ['QF', qf],
      ['SF', sf],
      ['Finals', [...final, ...thirdPlace]],
    ]
  }, [fixtureResults, playableQualifierBySeed])

  const resultKnockoutMatchContexts = useMemo(() => resultBracketRounds.flatMap(([round, matches]) =>
    matches
      .filter((match) => match.a?.team && match.b?.team)
      .map((match) => ({
        id: match.id,
        type: 'bracket',
        stage: match.label ?? round,
        home: match.a.team,
        away: match.b.team,
        venue: match.label === 'Final' ? 'New York New Jersey Stadium' : match.label === '3rd Place' ? 'Hard Rock Stadium' : 'Mercedes-Benz Stadium',
        date: `MVP schedule - ${lockText(knockoutLockAt(match.label ?? round)).toLowerCase()}`,
        lockAt: knockoutLockAt(match.label ?? round),
        events: liveEvents,
        backView: 'bracket',
        fallbackHome: match.fallbackHome,
        fallbackAway: match.fallbackAway,
      })),
  ), [resultBracketRounds])

  const resultKnockoutFixtureRows = useMemo(() => resultBracketRounds.flatMap(([round, matches]) =>
    matches.map((match) => {
      const isReady = Boolean(match.a?.team && match.b?.team)
      const stage = match.label ?? round
      return {
        id: match.id,
        type: 'bracket',
        stage,
        home: match.a?.team ?? 'TBD',
        away: match.b?.team ?? 'TBD',
        venue: match.label === 'Final' ? 'New York New Jersey Stadium' : match.label === '3rd Place' ? 'Hard Rock Stadium' : 'Mercedes-Benz Stadium',
        date: `MVP schedule - ${lockText(knockoutLockAt(stage)).toLowerCase()}`,
        lockAt: knockoutLockAt(stage),
        events: liveEvents,
        backView: 'bracket',
        fallbackHome: match.fallbackHome,
        fallbackAway: match.fallbackAway,
        isReady,
        blockedReason: isReady ? '' : `${stage} waits for earlier official results`,
      }
    }),
  ), [resultBracketRounds])

  const matchSequence = useMemo(() => [...groupMatchContexts, ...knockoutMatchContexts], [groupMatchContexts, knockoutMatchContexts])
  const resultMatchSequence = useMemo(() => [...groupMatchContexts, ...resultKnockoutMatchContexts], [groupMatchContexts, resultKnockoutMatchContexts])
  const resultFixtureRows = useMemo(() => [
    ...groupMatchContexts.map((match) => ({ ...match, isReady: true, blockedReason: '' })),
    ...resultKnockoutFixtureRows,
  ], [groupMatchContexts, resultKnockoutFixtureRows])
  const leagueRows = useMemo(() => league.members
    .map((member) => {
      const completion = memberCompletion(member)
      return {
        ...member,
        ...completion,
      }
    })
    .sort((a, b) => b.points - a.points || b.percent - a.percent || b.savedPicks - a.savedPicks || a.displayName.localeCompare(b.displayName)), [league.members])
  const selectedLeagueMember = leagueRows.find((member) => member.id === selectedLeagueMemberId) ?? null

  function scoreForContext(context) {
    if (context.type === 'group') return groupScores[context.id]
    return bracketScores[context.id] ?? {
      home: context.home,
      away: context.away,
      homeScore: context.fallbackHome ?? 0,
      awayScore: context.fallbackAway ?? 0,
    }
  }

  const activeScore = scoreForContext(matchContext)
  const activeLocked = isLockedAt(matchContext.lockAt) || Boolean(fixtureLocks[matchContext.id])
  const awardsLocked = isLockedAt(AWARD_LOCK_AT)
  const isKnockoutTie = matchContext.type === 'bracket' && activeScore.homeScore === activeScore.awayScore
  const pickComplete = matchContext.type === 'group'
    ? activeScore.touched
    : activeScore.homeScore !== activeScore.awayScore || Boolean(activeScore.advancerTeam)
  const pageTitle = `MyMundial ${viewTitles[view] ?? 'Cup Picks'}`
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!dirtyPick) return undefined
    const { context, score } = dirtyPick
    const autosaveKey = `${context.id}:${score.homeScore}:${score.awayScore}:${score.advancerTeam ?? ''}:${score.touched ? '1' : '0'}`
    const isComplete = context.type === 'group'
      ? score.touched
      : score.homeScore !== score.awayScore || Boolean(score.advancerTeam)
    if (!isComplete || !isSignedIn) return undefined
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        setSaveStatus({ loading: true, message: 'Autosaving pick...', error: '' })
        await supabaseMvpStore.savePrediction({
          profile,
          context,
          score,
          locked: false,
          league,
        })
        const remotePredictions = await supabaseMvpStore.loadPredictions(currentUser)
        const remoteLeague = await supabaseMvpStore.loadLeague(currentUser)
        setPredictionCount(remotePredictions.length)
        setLastSavedAt(latestPredictionTime(remotePredictions))
        if (remoteLeague) setLeague(remoteLeague)
        setSaveStatus({ loading: false, message: 'Autosaved to your account.', error: '' })
        setDirtyPick((current) => {
          if (!current) return current
          const currentKey = `${current.context.id}:${current.score.homeScore}:${current.score.awayScore}:${current.score.advancerTeam ?? ''}:${current.score.touched ? '1' : '0'}`
          return currentKey === autosaveKey ? null : current
        })
      } catch (error) {
        setSaveStatus({ loading: false, message: '', error: error.message })
      }
    }, 650)
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [currentUser, dirtyPick, isSignedIn, league, profile])

  function openMatch(context) {
    setMatchContext(context)
    setView('match')
    scrollToTop()
  }

  function goToAdjacentMatch(direction) {
    const currentIndex = matchSequence.findIndex((match) => match.id === matchContext.id)
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + matchSequence.length) % matchSequence.length
    openMatch(matchSequence[nextIndex])
  }

  function updateScore(team, delta) {
    if (isLockedAt(matchContext.lockAt) || fixtureLocks[matchContext.id]) {
      setSaveStatus({ loading: false, message: '', error: 'This match is locked. Picks can no longer be changed.' })
      return
    }
    const key = team === matchContext.home ? 'homeScore' : 'awayScore'
    const nextScore = {
      ...activeScore,
      home: matchContext.home,
      away: matchContext.away,
      [key]: Math.max(0, activeScore[key] + delta),
      touched: true,
    }
    if (nextScore.homeScore !== nextScore.awayScore) delete nextScore.advancerTeam
    const needsAdvancer = matchContext.type === 'bracket' && nextScore.homeScore === nextScore.awayScore && !nextScore.advancerTeam
    if (matchContext.type === 'group') {
      setGroupScores((current) => ({ ...current, [matchContext.id]: nextScore }))
    } else {
      setBracketScores((current) => ({
        ...current,
        [matchContext.id]: nextScore,
      }))
    }
    setDirtyPick({ context: matchContext, score: nextScore })
    setSaveStatus({
      loading: false,
      message: !isSignedIn
        ? 'Sign in to autosave predictions.'
        : needsAdvancer
          ? 'Choose who advances to autosave this knockout pick.'
          : 'Autosave queued.',
      error: '',
    })
  }

  function pickAdvancer(team) {
    if (matchContext.type !== 'bracket') return
    if (isLockedAt(matchContext.lockAt) || fixtureLocks[matchContext.id]) {
      setSaveStatus({ loading: false, message: '', error: 'This match is locked. Picks can no longer be changed.' })
      return
    }
    const nextScore = {
      ...activeScore,
      home: matchContext.home,
      away: matchContext.away,
      homeScore: activeScore.homeScore,
      awayScore: activeScore.awayScore,
      touched: true,
      advancerTeam: team,
    }
    setBracketScores((current) => ({
      ...current,
      [matchContext.id]: nextScore,
    }))
    setDirtyPick({ context: matchContext, score: nextScore })
    setSaveStatus({
      loading: false,
      message: isSignedIn ? 'Autosave queued.' : 'Sign in to autosave predictions.',
      error: '',
    })
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    if (!hasSupabaseConfig) {
      setAuthStatus({ loading: false, message: '', error: 'Add Supabase env vars before signing in.' })
      return
    }
    setAuthStatus({ loading: true, message: authMode === 'sign-up' ? 'Creating account...' : 'Signing in...', error: '' })
    try {
      const email = authForm.email.trim()
      const password = authForm.password
      const nextSession = authMode === 'sign-up'
        ? await supabaseMvpStore.signUp(email, password, authForm.displayName.trim())
        : await supabaseMvpStore.signIn(email, password)
      if (nextSession) setSession(nextSession)
      setAuthStatus({
        loading: false,
        message: nextSession ? 'Signed in and syncing picks.' : 'Account created. Check your email if confirmation is required.',
        error: '',
      })
      setAuthForm((current) => ({ ...current, password: '' }))
    } catch (error) {
      setAuthStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function handleSignOut() {
    setAuthStatus({ loading: true, message: 'Signing out...', error: '' })
    try {
      await supabaseMvpStore.signOut()
      setSession(null)
      const blank = blankProfile()
      setProfile(blank)
      setProfileDraft(blank)
      setLeague(emptyLeague())
      setLeagueName('MyMundial private league')
      setGroupScores(freshGroupScores())
      setBracketScores({})
      setAwardPicks({})
      setFixtureResults({})
      setAwardResults({})
      setFixtureLocks({})
      setIsAdmin(false)
      setPredictionCount(0)
      setLastSavedAt(null)
      setDirtyPick(null)
      setSaveStatus({ loading: false, message: 'Sign in to autosave picks.', error: '' })
      setAuthStatus({ loading: false, message: 'Signed out. Predictions are not saved unless you sign in.', error: '' })
    } catch (error) {
      setAuthStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function saveProfile() {
    try {
      if (isSignedIn) {
        const nextProfile = await supabaseMvpStore.saveProfile(currentUser, profileDraft)
        const remoteLeague = await supabaseMvpStore.loadLeague(currentUser)
        setProfile(nextProfile)
        setProfileDraft(nextProfile)
        if (remoteLeague) {
          setLeague(remoteLeague)
          setLeagueName(remoteLeague.name)
        }
        setAuthStatus({ loading: false, message: 'Profile saved to Supabase.', error: '' })
        return
      }
      setAuthStatus({ loading: false, message: '', error: 'Sign in before saving a profile.' })
    } catch (error) {
      setAuthStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function createLeague() {
    if (!isSignedIn) {
      setLeagueStatus({ loading: false, message: '', error: 'Sign in before creating a private league.' })
      setView('leagues')
      return
    }
    setLeagueStatus({ loading: true, message: 'Creating private league...', error: '' })
    try {
      const remoteLeague = await supabaseMvpStore.createLeague(leagueName, profile, currentUser)
      setLeague(remoteLeague)
      setLeagueName(remoteLeague.name)
      setLeagueStatus({ loading: false, message: 'Private league created. Share the invite code with friends.', error: '' })
    } catch (error) {
      setLeagueStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function updateLeagueName() {
    if (!isSignedIn) {
      setLeagueStatus({ loading: false, message: '', error: 'Sign in before editing a private league.' })
      return
    }
    setLeagueStatus({ loading: true, message: 'Updating league...', error: '' })
    try {
      const remoteLeague = await supabaseMvpStore.updateLeagueName(league, leagueName, currentUser)
      setLeague(remoteLeague)
      setLeagueName(remoteLeague.name)
      setLeagueStatus({ loading: false, message: 'League name updated.', error: '' })
    } catch (error) {
      setLeagueStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function joinLeague() {
    if (!isSignedIn) {
      setLeagueStatus({ loading: false, message: '', error: 'Create an account or sign in before joining a league.' })
      setView('leagues')
      return
    }
    const codeToJoin = (inviteCode || league.inviteCode).trim()
    if (!codeToJoin || codeToJoin === 'SIGNIN') {
      setLeagueStatus({ loading: false, message: '', error: 'Enter an invite code.' })
      return
    }
    setLeagueStatus({ loading: true, message: `Joining ${codeToJoin.toUpperCase()}...`, error: '' })
    try {
      const remoteLeague = await supabaseMvpStore.joinLeague(codeToJoin, currentUser)
      setLeague(remoteLeague)
      setLeagueName(remoteLeague.name)
      setLeagueStatus({ loading: false, message: `Joined ${remoteLeague.name}.`, error: '' })
      setInviteCode('')
    } catch (error) {
      setLeagueStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function copyInviteLink() {
    const inviteUrl = leagueInviteUrl(league.inviteCode)
    if (!inviteUrl) {
      setShareStatus('Create a league first.')
      return
    }
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setShareStatus('Invite link copied.')
    } catch {
      setShareStatus(inviteUrl)
    }
  }

  async function saveAwardPick(award, recipient) {
    setSelectedAward(award.id)
    if (isLockedAt(AWARD_LOCK_AT)) {
      setAwardSaveStatus({ loading: false, message: '', error: 'Awards are locked. Picks can no longer be changed.' })
      return
    }
    setAwardSaveStatus({ loading: true, message: `Saving ${award.label}...`, error: '' })
    try {
      if (isSignedIn) {
        const savedAward = await supabaseMvpStore.saveAwardPick({ profile, award, recipient })
        const remoteLeague = await supabaseMvpStore.loadLeague(currentUser)
        setAwardPicks((current) => ({ ...current, [award.id]: savedAward }))
        setLastSavedAt(savedAward.updatedAt)
        if (remoteLeague) setLeague(remoteLeague)
        setAwardSaveStatus({ loading: false, message: `${award.label} synced to your account.`, error: '' })
        return
      }
      setAwardSaveStatus({ loading: false, message: '', error: 'Sign in before saving award picks.' })
    } catch (error) {
      setAwardSaveStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function saveFixtureResult(context, result) {
    if (!isSignedIn || !isAdmin) {
      setResultStatus({ loading: false, message: '', error: 'Admin access is required to enter official results.' })
      return
    }
    setResultStatus({ loading: true, message: `Saving ${context.home} vs ${context.away}...`, error: '' })
    try {
      const savedResult = await supabaseMvpStore.saveFixtureResult({ context, result })
      const [remoteResults, remoteLeague] = await Promise.all([
        supabaseMvpStore.loadResults(),
        supabaseMvpStore.loadLeague(currentUser),
      ])
      setFixtureResults(remoteResults.fixtures)
      setAwardResults(remoteResults.awards)
      setFixtureLocks(remoteResults.locks ?? {})
      if (remoteLeague) setLeague(remoteLeague)
      setResultStatus({
        loading: false,
        message: `${savedResult.homeTeam} ${savedResult.homeScore}-${savedResult.awayScore} ${savedResult.awayTeam} settled.`,
        error: '',
      })
    } catch (error) {
      setResultStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function saveAwardResult(award, recipient) {
    if (!isSignedIn || !isAdmin) {
      setResultStatus({ loading: false, message: '', error: 'Admin access is required to enter award results.' })
      return
    }
    setResultStatus({ loading: true, message: `Saving ${award.label} result...`, error: '' })
    try {
      const savedAward = await supabaseMvpStore.saveAwardResult({ award, recipient })
      const [remoteResults, remoteLeague] = await Promise.all([
        supabaseMvpStore.loadResults(),
        supabaseMvpStore.loadLeague(currentUser),
      ])
      setFixtureResults(remoteResults.fixtures)
      setAwardResults(remoteResults.awards)
      setFixtureLocks(remoteResults.locks ?? {})
      if (remoteLeague) setLeague(remoteLeague)
      setResultStatus({ loading: false, message: `${savedAward.awardLabel} settled as ${savedAward.recipient}.`, error: '' })
    } catch (error) {
      setResultStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function clearFixtureResult(context) {
    if (!isSignedIn || !isAdmin) {
      setResultStatus({ loading: false, message: '', error: 'Admin access is required to reset results.' })
      return
    }
    setResultStatus({ loading: true, message: `Resetting ${context.home} vs ${context.away}...`, error: '' })
    try {
      await supabaseMvpStore.clearFixtureResult(context)
      const [remoteResults, remoteLeague] = await Promise.all([
        supabaseMvpStore.loadResults(),
        supabaseMvpStore.loadLeague(currentUser),
      ])
      setFixtureResults(remoteResults.fixtures)
      setAwardResults(remoteResults.awards)
      setFixtureLocks(remoteResults.locks ?? {})
      if (remoteLeague) setLeague(remoteLeague)
      setResultStatus({ loading: false, message: `${context.home} vs ${context.away} reset to not played.`, error: '' })
    } catch (error) {
      setResultStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function toggleFixtureLock(context) {
    if (!isSignedIn || !isAdmin) {
      setResultStatus({ loading: false, message: '', error: 'Admin access is required to lock predictions.' })
      return
    }
    const isFixtureLocked = Boolean(fixtureLocks[context.id])
    setResultStatus({ loading: true, message: `${isFixtureLocked ? 'Unlocking' : 'Locking'} ${context.home} vs ${context.away}...`, error: '' })
    try {
      if (isFixtureLocked) {
        await supabaseMvpStore.unlockFixture(context)
      } else {
        await supabaseMvpStore.lockFixture(context)
      }
      const remoteResults = await supabaseMvpStore.loadResults()
      setFixtureResults(remoteResults.fixtures)
      setAwardResults(remoteResults.awards)
      setFixtureLocks(remoteResults.locks ?? {})
      setResultStatus({ loading: false, message: `${context.home} vs ${context.away} ${isFixtureLocked ? 'unlocked' : 'locked'}.`, error: '' })
    } catch (error) {
      setResultStatus({ loading: false, message: '', error: error.message })
    }
  }

  async function clearAwardResult(award) {
    if (!isSignedIn || !isAdmin) {
      setResultStatus({ loading: false, message: '', error: 'Admin access is required to reset award results.' })
      return
    }
    setResultStatus({ loading: true, message: `Resetting ${award.label}...`, error: '' })
    try {
      await supabaseMvpStore.clearAwardResult(award)
      const [remoteResults, remoteLeague] = await Promise.all([
        supabaseMvpStore.loadResults(),
        supabaseMvpStore.loadLeague(currentUser),
      ])
      setFixtureResults(remoteResults.fixtures)
      setAwardResults(remoteResults.awards)
      setFixtureLocks(remoteResults.locks ?? {})
      if (remoteLeague) setLeague(remoteLeague)
      setResultStatus({ loading: false, message: `${award.label} reset to pending.`, error: '' })
    } catch (error) {
      setResultStatus({ loading: false, message: '', error: error.message })
    }
  }

  return (
    <main className={`app-shell ${isDark ? 'dark' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Trophy size={22} /></span>
          <div>
            <strong>MyMundial</strong>
            <small>World Cup 2026</small>
          </div>
        </div>
        <nav>
          {[...navItems, ...(isAdmin ? [adminNavItem] : [])].map((item) => {
            const Icon = item.icon
            return (
              <button className={view === item.id ? 'active' : ''} key={item.id} onClick={() => {
                setView(item.id)
                scrollToTop()
              }}>
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="side-card">
          <span>{isSignedIn ? 'Autosave on' : 'Sign in to save'}</span>
          <strong>{predictionCount}</strong>
          <small>{isSignedIn ? 'saved predictions' : 'no picks saved'}</small>
          {(saveStatus.message || saveStatus.error) && (
            <small className={saveStatus.error ? 'side-error' : 'side-success'}>
              {saveStatus.error || saveStatus.message}
            </small>
          )}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">MyMundial</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-right">
            <div className="top-actions">
              <button
                className="theme-toggle"
                onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button onClick={() => setView('leagues')}><Users size={16} /> {isSignedIn ? profile.displayName : league.name}</button>
            </div>
            {view !== 'match' && (
              <div className="tournament-summary">
                <div><strong>{groupMatchups.length}</strong><span>group matches</span></div>
                <div><strong>48</strong><span>teams</span></div>
              </div>
            )}
          </div>
        </header>

        {!isSignedIn && view !== 'leagues' && (
          <SignedOutSplash onOpenAccount={() => setView('leagues')} />
        )}

        {isSignedIn && view === 'groups' && (
          <SignedInGuide displayName={profile.displayName} />
        )}

        {view === 'groups' && (
          <GroupsView standings={standings} openMatch={openMatch} groupScores={groupScores} fixtureResults={fixtureResults} />
        )}

        {view === 'bracket' && (
          <section className="bracket-layout bracket-only">
            <div className="panel bracket-panel bracket-stage">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Dynamic knockout stage</p>
                  <h2>Path to the final</h2>
                </div>
                <span className="pill live"><Radio size={14} /> Live reconciliation on</span>
              </div>
              <div className="bracket-scroll bracket-path">
                {bracketRounds.map(([round, matches], roundIndex) => (
                  <div className={`round-column round-${roundIndex}`} key={round}>
                    <h3>{round}</h3>
                    {matches.map((match, matchIndex) => {
                      const context = {
                        id: match.id,
                        type: 'bracket',
                        stage: match.label ?? round,
                        home: match.a?.team ?? 'TBD',
                        away: match.b?.team ?? 'TBD',
                        venue: match.label === 'Final' ? 'New York New Jersey Stadium' : match.label === '3rd Place' ? 'Hard Rock Stadium' : 'Mercedes-Benz Stadium',
                        date: `MVP schedule - ${lockText(knockoutLockAt(match.label ?? round)).toLowerCase()}`,
                        lockAt: knockoutLockAt(match.label ?? round),
                        events: liveEvents,
                        backView: 'bracket',
                        fallbackHome: match.fallbackHome,
                        fallbackAway: match.fallbackAway,
                      }
                      const score = bracketScores[match.id]
                      const settlement = score && match.a?.team && match.b?.team
                        ? settlementForPredictionView(predictionFromContextScore(context, score), fixtureResults)
                        : null
                      return (
                        <button
                          className={`match-card ${match.state} ${settlement?.mode === 'settled' ? `settled ${settlement.state}` : ''}`}
                          key={match.id}
                          style={{ '--slot-row': bracketSlotRow(roundIndex, matchIndex) }}
                          disabled={!match.a?.team || !match.b?.team}
                          onClick={() => openMatch(context)}
                        >
                          {match.label && <span className="match-label">{match.label}</span>}
                          <MatchTeam
                            slot={match.a?.team && match.b?.team ? match.a : undefined}
                            score={(bracketScores[match.id]?.homeScore ?? match.fallbackHome)}
                            picked={match.picked?.team === match.a?.team}
                            recognized={settlement?.recognizedTeams?.includes(match.a?.team)}
                          />
                          <MatchTeam
                            slot={match.a?.team && match.b?.team ? match.b : undefined}
                            score={(bracketScores[match.id]?.awayScore ?? match.fallbackAway)}
                            picked={match.picked?.team === match.b?.team}
                            recognized={settlement?.recognizedTeams?.includes(match.b?.team)}
                          />
                          <span className="match-state">{settlement?.mode === 'settled' ? settlement.label : bracketPickLabel(match, score)}</span>
                          {settlement?.mode === 'settled' && <span className="settlement-detail">{settlement.detail}</span>}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === 'match' && (
          <section className="page-grid match-page">
            <MatchPanel
              score={activeScore}
              updateScore={updateScore}
              context={matchContext}
              onBack={() => setView(matchContext.backView)}
              onPreviousMatch={() => goToAdjacentMatch(-1)}
              onNextMatch={() => goToAdjacentMatch(1)}
              onPickAdvancer={pickAdvancer}
              pickComplete={pickComplete}
              isKnockoutTie={isKnockoutTie}
              saveStatus={saveStatus}
              isSignedIn={isSignedIn}
              isLocked={activeLocked}
              settlement={pickComplete ? settlementForPredictionView(predictionFromContextScore(matchContext, activeScore), fixtureResults) : null}
            />
            <MvpMatchRail context={matchContext} score={activeScore} settlement={pickComplete ? settlementForPredictionView(predictionFromContextScore(matchContext, activeScore), fixtureResults) : null} />
          </section>
        )}

        {view === 'leagues' && (
          <section className="page-grid leagues-page">
            <div className="league-stack">
              <AccountPanel
                profile={profile}
                draft={profileDraft}
                setDraft={setProfileDraft}
                onSave={saveProfile}
                lastSavedAt={lastSavedAt}
                predictionCount={predictionCount}
                hasSupabaseConfig={hasSupabaseConfig}
                isSignedIn={isSignedIn}
                authMode={authMode}
                setAuthMode={setAuthMode}
                authForm={authForm}
                setAuthForm={setAuthForm}
                authStatus={authStatus}
                onAuthSubmit={handleAuthSubmit}
                onSignOut={handleSignOut}
              />
              <LeagueManager
                league={league}
                leagueRows={leagueRows}
                leagueName={leagueName}
                setLeagueName={setLeagueName}
                inviteCode={inviteCode}
                setInviteCode={setInviteCode}
                onCreate={createLeague}
                onUpdateName={updateLeagueName}
                onJoin={joinLeague}
                onCopyInvite={copyInviteLink}
                leagueStatus={leagueStatus}
                shareStatus={shareStatus}
                isSignedIn={isSignedIn}
              />
            </div>
            <LeagueStandings
              league={league}
              rows={leagueRows}
              onViewPredictions={setSelectedLeagueMemberId}
            />
            <LeagueActivity league={league} />
            {selectedLeagueMember && (
              <MemberPredictionModal
                member={selectedLeagueMember}
                scoringMode={league.scoringMode}
                matchSequence={matchSequence}
                fixtureResults={fixtureResults}
                awardResults={awardResults}
                onClose={() => setSelectedLeagueMemberId(null)}
              />
            )}
          </section>
        )}

        {view === 'awards' && (
          <AwardsView
            selectedAward={selectedAward}
            setSelectedAward={setSelectedAward}
            awardPicks={awardPicks}
            awardResults={awardResults}
            onSaveAwardPick={saveAwardPick}
            awardSaveStatus={awardSaveStatus}
            isSignedIn={isSignedIn}
            isLocked={awardsLocked}
            lockLabel={lockText(AWARD_LOCK_AT)}
          />
        )}

        {view === 'results' && isAdmin && (
          <ResultsView
            matchSequence={resultMatchSequence}
            fixtureRows={resultFixtureRows}
            fixtureResults={fixtureResults}
            awardResults={awardResults}
            fixtureLocks={fixtureLocks}
            onSaveFixtureResult={saveFixtureResult}
            onClearFixtureResult={clearFixtureResult}
            onToggleFixtureLock={toggleFixtureLock}
            onSaveAwardResult={saveAwardResult}
            onClearAwardResult={clearAwardResult}
            resultStatus={resultStatus}
          />
        )}
      </section>
    </main>
  )
}

function SignedOutSplash({ onOpenAccount }) {
  return (
    <section className="splash-panel">
      <div>
        <p className="eyebrow">Ready to save your bracket?</p>
        <h2>Sign in before you start picking</h2>
        <p>You can browse the tournament while signed out, but predictions only autosave to signed-in accounts.</p>
      </div>
      <button className="primary" onClick={onOpenAccount}><UserRound size={16} /> Sign in or create account</button>
    </section>
  )
}

function SignedInGuide({ displayName }) {
  return (
    <section className="guide-panel">
      <strong>{displayName}, build your bracket in three passes</strong>
      <span>Pick group scores, check the bracket path, then choose tournament awards. Your picks autosave after each change.</span>
    </section>
  )
}

function bracketSlotRow(roundIndex, matchIndex) {
  if (roundIndex === 4) return matchIndex === 0 ? 19 : 31
  const spacing = 2 ** roundIndex
  const offset = Math.max(1, spacing)
  return 3 + (matchIndex * spacing * 2) + offset
}

function groupPickLabel(score) {
  if (!score.touched) return 'No pick'
  if (score.homeScore === score.awayScore) return 'Draw'
  return 'Picked'
}

function bracketPickLabel(match, score) {
  if (!score) return 'No pick'
  if (match.state === 'needs winner') return 'Pick advancer'
  if (score.homeScore === score.awayScore && score.advancerTeam) return `${meta(score.advancerTeam).code} advances`
  return 'Picked'
}

function scoreKey(prediction) {
  return `${prediction.homeTeam} ${prediction.predictedHomeScore}-${prediction.predictedAwayScore} ${prediction.awayTeam}`
}

const GROUP_TOTAL_POINTS = 160
const KNOCKOUT_TOTAL_POINTS = 260

function predictionOutcome(homeScore, awayScore, homeTeam, awayTeam, advancingTeam, fixtureType) {
  if (fixtureType === 'bracket' && homeScore === awayScore) return advancingTeam ?? null
  if (homeScore === awayScore) return 'draw'
  return homeScore > awayScore ? homeTeam : awayTeam
}

function resultOutcome(result) {
  if (!result) return null
  return predictionOutcome(
    result.homeScore,
    result.awayScore,
    result.homeTeam,
    result.awayTeam,
    result.advancingTeam,
    result.fixtureType,
  )
}

function resultTeams(result) {
  return result ? [result.homeTeam, result.awayTeam] : []
}

function scorePairForTeam(record, team, homeKey, awayKey) {
  if (!record || !team) return null
  if (record.homeTeam === team) return { teamScore: record[homeKey], opponentScore: record[awayKey] }
  if (record.awayTeam === team) return { teamScore: record[awayKey], opponentScore: record[homeKey] }
  return null
}

function sameOrderedFixture(prediction, result) {
  return Boolean(
    result
    && prediction.fixtureId === result.fixtureKey
    && prediction.homeTeam === result.homeTeam
    && prediction.awayTeam === result.awayTeam,
  )
}

function knockoutSettlementForPrediction(prediction, fixtureResults) {
  const stageResults = Object.values(fixtureResults).filter((result) => (
    result.fixtureType === 'bracket' && result.stage === prediction.stage
  ))
  if (!stageResults.length) return null
  const predictedWinner = predictionOutcome(
    prediction.predictedHomeScore,
    prediction.predictedAwayScore,
    prediction.homeTeam,
    prediction.awayTeam,
    prediction.advancingTeam,
    prediction.fixtureType,
  )
  const predictedOtherTeam = predictedWinner === prediction.homeTeam ? prediction.awayTeam : prediction.homeTeam
  const winnerResult = stageResults.find((result) => resultOutcome(result) === predictedWinner)
  const winnerAppearanceResult = stageResults.find((result) => resultTeams(result).includes(predictedWinner))
  const otherAppearanceResult = stageResults.find((result) => resultTeams(result).includes(predictedOtherTeam))
  const winnerCorrect = Boolean(winnerResult)
  const winnerParticipantCorrect = Boolean(winnerAppearanceResult)
  const participantCorrect = Boolean(otherAppearanceResult)
  const comparisonTeam = winnerCorrect || winnerAppearanceResult
    ? predictedWinner
    : participantCorrect
      ? predictedOtherTeam
      : null
  const comparisonResult = winnerResult ?? winnerAppearanceResult ?? otherAppearanceResult ?? null
  const predictionPair = scorePairForTeam(prediction, comparisonTeam, 'predictedHomeScore', 'predictedAwayScore')
  const resultPair = scorePairForTeam(comparisonResult, comparisonTeam, 'homeScore', 'awayScore')
  const canScoreScore = Boolean(predictionPair && resultPair)
  const exactCorrect = canScoreScore
    && predictionPair.teamScore === resultPair.teamScore
    && predictionPair.opponentScore === resultPair.opponentScore
  const goalDifferenceCorrect = canScoreScore
    && predictionPair.teamScore - predictionPair.opponentScore === resultPair.teamScore - resultPair.opponentScore
  const points =
    (winnerParticipantCorrect ? 50 : 0)
    + (participantCorrect ? 50 : 0)
    + (winnerCorrect ? 100 : 0)
    + (exactCorrect ? 40 : 0)
    + (goalDifferenceCorrect ? 20 : 0)
  const recognizedTeams = [
    winnerParticipantCorrect ? predictedWinner : null,
    participantCorrect ? predictedOtherTeam : null,
  ].filter(Boolean)
  return {
    mode: 'settled',
    state: points === KNOCKOUT_TOTAL_POINTS ? 'correct' : points > 0 ? 'partial' : 'missed',
    points,
    total: KNOCKOUT_TOTAL_POINTS,
    label: `${points}/${KNOCKOUT_TOTAL_POINTS} pts`,
    detail: points ? `${recognizedTeams.map((team) => meta(team).code).join(', ')} recognized at ${prediction.stage}` : 'Missed',
    breakdown: {
      outcomeCorrect: winnerCorrect,
      winnerParticipantCorrect,
      participantCorrect,
      exactCorrect,
      goalDifferenceCorrect,
    },
    result: comparisonResult ?? stageResults[0],
    recognizedTeams,
  }
}

function settlementForPredictionView(prediction, fixtureResults) {
  const directResult = fixtureResults[prediction.fixtureId]
  if (!prediction) return null
  if (prediction.fixtureType === 'bracket') {
    const knockoutSettlement = knockoutSettlementForPrediction(prediction, fixtureResults)
    if (knockoutSettlement) return knockoutSettlement
  }
  if (!directResult) {
    return {
      mode: 'pending',
      state: 'pending',
      points: 0,
      total: prediction.fixtureType === 'bracket' ? KNOCKOUT_TOTAL_POINTS : GROUP_TOTAL_POINTS,
      label: 'Pending',
      detail: 'No result yet',
      breakdown: {
        outcomeCorrect: false,
        winnerParticipantCorrect: false,
        participantCorrect: false,
        exactCorrect: false,
        goalDifferenceCorrect: false,
      },
      recognizedTeams: [],
    }
  }
  const result = directResult
  const predictedWinner = predictionOutcome(
    prediction.predictedHomeScore,
    prediction.predictedAwayScore,
    prediction.homeTeam,
    prediction.awayTeam,
    prediction.advancingTeam,
    prediction.fixtureType,
  )
  const actualWinner = resultOutcome(result)
  const outcomeCorrect = Boolean(predictedWinner && actualWinner && predictedWinner === actualWinner)
  const canScoreExact = sameOrderedFixture(prediction, result)
  const exactCorrect = canScoreExact
    && prediction.predictedHomeScore === result.homeScore
    && prediction.predictedAwayScore === result.awayScore
  const goalDifferenceCorrect = canScoreExact
    && prediction.predictedHomeScore - prediction.predictedAwayScore === result.homeScore - result.awayScore
  const points = (outcomeCorrect ? 100 : 0) + (exactCorrect ? 40 : 0) + (goalDifferenceCorrect ? 20 : 0)
  return {
    mode: 'settled',
    state: points === GROUP_TOTAL_POINTS ? 'correct' : points > 0 ? 'partial' : 'missed',
    points,
    total: GROUP_TOTAL_POINTS,
    label: `${points}/${GROUP_TOTAL_POINTS} pts`,
    detail: points ? 'Points earned' : 'Missed',
    breakdown: {
      outcomeCorrect,
      winnerParticipantCorrect: false,
      participantCorrect: false,
      exactCorrect,
      goalDifferenceCorrect,
    },
    result,
    recognizedTeams: outcomeCorrect && predictedWinner !== 'draw' ? [predictedWinner] : [],
  }
}

function predictionFromContextScore(context, score) {
  const advancingTeam = score.advancerTeam
    ?? (score.homeScore > score.awayScore ? context.home : score.homeScore < score.awayScore ? context.away : null)
  return {
    fixtureId: context.id,
    fixtureType: context.type,
    stage: context.stage,
    homeTeam: context.home,
    awayTeam: context.away,
    predictedHomeScore: score.homeScore,
    predictedAwayScore: score.awayScore,
    advancingTeam,
  }
}

function awardSettlementView(award, awardPick, awardResults) {
  const result = awardResults[award.id]
  if (!result) return { mode: 'pending', state: 'pending', points: 0, total: award.points, label: 'Pending', detail: 'No result yet' }
  const correct = awardPick?.recipient?.trim().toLowerCase() === result.recipient.trim().toLowerCase()
  return {
    mode: 'settled',
    state: correct ? 'correct' : 'missed',
    points: correct ? award.points : 0,
    total: award.points,
    label: `${correct ? award.points : 0}/${award.points} pts`,
    detail: correct ? 'Correct' : `Official: ${result.recipient}`,
    result,
  }
}

function standingsForPredictions(predictions) {
  const scores = freshGroupScores()
  predictions
    .filter((prediction) => prediction.fixtureType === 'group' && scores[prediction.fixtureId])
    .forEach((prediction) => {
      scores[prediction.fixtureId] = {
        ...scores[prediction.fixtureId],
        home: prediction.homeTeam,
        away: prediction.awayTeam,
        homeScore: prediction.predictedHomeScore,
        awayScore: prediction.predictedAwayScore,
        touched: true,
      }
    })
  return buildStandings(scores)
}

function standingsForFixtureResults(fixtureResults) {
  const scores = freshGroupScores()
  Object.values(fixtureResults)
    .filter((result) => result.fixtureType === 'group' && scores[result.fixtureKey])
    .forEach((result) => {
      scores[result.fixtureKey] = {
        ...scores[result.fixtureKey],
        home: result.homeTeam,
        away: result.awayTeam,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        touched: true,
      }
    })
  return buildStandings(scores)
}

function settledGroupIds(fixtureResults) {
  return new Set(
    Object.values(fixtureResults)
      .filter((result) => result.fixtureType === 'group')
      .map((result) => result.stage?.replace('Group ', '') ?? result.fixtureKey?.split('-')[0])
      .filter(Boolean),
  )
}

function groupStandingState(groupId, row, index, actualGroupStandings, settledGroups) {
  if (!settledGroups.has(groupId)) return 'pending'
  const actualRows = actualGroupStandings[groupId] ?? []
  if (actualRows[index]?.team === row.team) return 'correct'
  if (index < 3 && actualRows.slice(0, 3).some((actualRow) => actualRow.team === row.team)) return 'partial'
  return 'missed'
}

function bracketPredictionsByStage(predictions) {
  const order = ['R32', 'R16', 'QF', 'SF', 'Final', '3rd Place']
  const grouped = Object.fromEntries(order.map((stage) => [stage, []]))
  predictions
    .filter((prediction) => prediction.fixtureType === 'bracket')
    .forEach((prediction) => {
      const stage = order.includes(prediction.stage) ? prediction.stage : prediction.stage === 'Finals' ? 'Final' : 'R32'
      grouped[stage].push(prediction)
    })
  return order.map((stage) => [stage, grouped[stage]])
}

function predictionsFromActivity(member, matchSequence) {
  const contextById = Object.fromEntries(matchSequence.map((context) => [context.id, context]))
  const rowsByFixture = new Map()
  const activities = member.activity ?? []
  activities
    .filter((activity) => activity.type === 'prediction_saved' && activity.metadata?.fixture_key)
    .forEach((activity) => {
      const context = contextById[activity.metadata.fixture_key]
      const scoreMatch = String(activity.metadata.summary ?? '').match(/(\d+)-(\d+)/)
      if (!context || !scoreMatch || rowsByFixture.has(context.id)) return
      const advancerMatch = String(activity.metadata.summary ?? '').match(/,\s*(.+?)\s+advances\.?$/i)
      rowsByFixture.set(context.id, {
        id: `activity-${activity.id}`,
        userId: member.id,
        fixtureId: context.id,
        fixtureType: context.type,
        stage: context.stage,
        homeTeam: context.home,
        awayTeam: context.away,
        predictedHomeScore: Number(scoreMatch[1]),
        predictedAwayScore: Number(scoreMatch[2]),
        advancingTeam: advancerMatch?.[1] ?? null,
        updatedAt: activity.createdAt,
        resultState: 'draft',
        fromActivity: true,
      })
    })
  return Array.from(rowsByFixture.values())
}

function GroupsView({ standings, openMatch, groupScores, fixtureResults }) {
  return (
    <section className="groups-page">
      <div className="panel wide">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Immediate predictions</p>
            <h2>Group matches and live tables</h2>
          </div>
          <span className="pill">Scores update the R32 feed</span>
        </div>
        <div className="group-grid">
          {groups.map((group) => (
            <article className="group-card" key={group.id}>
              <div className="group-title">
                <strong>Group {group.id}</strong>
                <span>{standings[group.id][0].team} projected winner</span>
              </div>
              <div className="table-head"><span>Team</span><span>GD</span><span>Pts</span></div>
              {standings[group.id].map((row, index) => (
                <div className={`rank-row rank-${index + 1}`} key={row.team}>
                  <span className="rank">{index + 1}</span>
                  <TeamBadge team={row.team} />
                  <span>{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
                  <strong>{row.pts}</strong>
                </div>
              ))}
              <div className="group-matches">
                {groupMatchups.filter((match) => match.group === group.id).map((match) => {
                  const score = groupScores[match.id]
                  const context = {
                    id: match.id,
                    type: 'group',
                    stage: `Group ${match.group}`,
                    home: match.home,
                    away: match.away,
                    venue: match.venue,
                    date: `${match.date} - ${lockText(groupLockAt(match)).toLowerCase()}`,
                    lockAt: groupLockAt(match),
                    events: groupMatchEvents,
                    backView: 'groups',
                  }
                  const settlement = score.touched
                    ? settlementForPredictionView(predictionFromContextScore(context, score), fixtureResults)
                    : null
                  return (
                    <button
                      className={`group-match ${score.touched ? 'has-pick' : 'no-pick'} ${score.touched && score.homeScore === score.awayScore ? 'draw-pick' : ''} ${settlement?.mode === 'settled' ? `settled ${settlement.state}` : ''}`}
                      key={match.id}
                      onClick={() => openMatch(context)}
                    >
                      <TeamBadge team={match.home} />
                      <strong>{score.homeScore} - {score.awayScore}</strong>
                      <TeamBadge team={match.away} />
                      <span className="pick-status">{settlement?.mode === 'settled' ? settlement.label : groupPickLabel(score)}</span>
                      {settlement?.mode === 'settled' && <span className="settlement-detail">{settlement.detail}</span>}
                    </button>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function MatchTeam({ slot, score, picked, recognized }) {
  if (!slot) return <div className="match-team muted">TBD</div>
  return (
    <div className={`match-team ${recognized ? 'recognized' : ''}`}>
      <TeamBadge team={slot.team} seed={slot.seed} />
      <strong>{score}</strong>
      {picked && <Check size={14} />}
    </div>
  )
}

function MatchPanel({
  score,
  updateScore,
  context,
  onBack,
  onPreviousMatch,
  onNextMatch,
  onPickAdvancer,
  pickComplete,
  isKnockoutTie,
  saveStatus,
  isSignedIn,
  isLocked,
  settlement,
  compact = false,
}) {
  const saveTooltip = isLocked
    ? 'This match is locked. Picks can no longer be changed.'
    : isSignedIn
    ? 'Autosave is on. Score changes sync to your account after a moment.'
    : 'Sign in to autosave predictions to your account.'
  return (
    <aside className={`panel match-detail ${compact ? 'compact' : ''}`}>
      <div className="match-meta">
        <button onClick={onBack}><ChevronRight size={16} /> Back to {context.backView === 'groups' ? 'Groups' : 'Bracket'}</button>
        <span className={isLocked ? 'locked-text' : ''}><CalendarClock size={15} /> {context.date}</span>
      </div>
      <div className="match-jump">
        <button onClick={onPreviousMatch}>Previous match</button>
        <button className="primary-lite" onClick={onNextMatch}>Next match</button>
      </div>
      <div className="score-hero">
        <TeamBadge team={context.home} />
        <div className="score-center">
          <span className="pill live">{context.stage} - your pick</span>
          <strong>{score.homeScore} - {score.awayScore}</strong>
          <small>{context.venue}</small>
        </div>
        <TeamBadge team={context.away} />
      </div>
      {settlement?.mode === 'settled' && (
        <div className={`official-result-card ${settlement.state}`}>
          <div>
            <span>Official result</span>
            <strong>
              {settlement.result.homeTeam} {settlement.result.homeScore}-{settlement.result.awayScore} {settlement.result.awayTeam}
            </strong>
            {settlement.result.advancingTeam && <small>{settlement.result.advancingTeam} advanced</small>}
          </div>
          <div>
            <span>Points earned</span>
            <strong>{settlement.points}/{settlement.total}</strong>
            <small>{settlement.detail}</small>
          </div>
        </div>
      )}
      <div className="score-controls">
        {[context.home, context.away].map((team) => (
          <div className="stepper" key={team}>
            <span>{team}</span>
            <button onClick={() => updateScore(team, -1)} disabled={isLocked}><CircleMinus size={18} /></button>
            <strong>{team === context.home ? score.homeScore : score.awayScore}</strong>
            <button onClick={() => updateScore(team, 1)} disabled={isLocked}><CirclePlus size={18} /></button>
          </div>
        ))}
      </div>
      {isKnockoutTie && (
        <div className="advancer-picker">
          <div>
            <strong>Who advances?</strong>
            <span>Score can stay tied; choose the team that wins after extra time or penalties.</span>
          </div>
          <div>
            {[context.home, context.away].map((team) => (
              <button className={score.advancerTeam === team ? 'selected' : ''} key={team} onClick={() => onPickAdvancer(team)} disabled={isLocked}>
                <TeamBadge team={team} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="save-tooltip" title={saveTooltip}>
        <Info size={15} />
        <span>{saveTooltip}</span>
      </div>
      {(saveStatus.message || saveStatus.error) && (
        <p className={`save-message ${saveStatus.error ? 'error' : ''}`}>{saveStatus.error || saveStatus.message}</p>
      )}
      {settlement?.mode === 'settled' && (
        <div className={`settlement-summary ${settlement.state}`}>
          <strong>{settlement.label}</strong>
          <span>
            Your pick: {context.home} {score.homeScore}-{score.awayScore} {context.away}
            {score.advancerTeam ? `, ${score.advancerTeam} advances` : ''}
          </span>
        </div>
      )}
      <div className="points-stack">
        {context.type === 'bracket' && (
          <ScoreLine
            label="Predicted winner reached stage"
            value={settlement?.mode === 'settled' ? (settlement.breakdown.winnerParticipantCorrect ? '+50' : '+0') : pickComplete ? '+50 possible' : 'pending'}
            state={settlement?.mode === 'settled' ? settlement.breakdown.winnerParticipantCorrect ? 'correct' : 'missed' : pickComplete ? 'partial' : 'pending'}
          />
        )}
        {context.type === 'bracket' && (
          <ScoreLine
            label="Other team reached stage"
            value={settlement?.mode === 'settled' ? (settlement.breakdown.participantCorrect ? '+50' : '+0') : pickComplete ? '+50 possible' : 'pending'}
            state={settlement?.mode === 'settled' ? settlement.breakdown.participantCorrect ? 'correct' : 'missed' : pickComplete ? 'partial' : 'pending'}
          />
        )}
        <ScoreLine
          label={context.type === 'bracket' ? 'Predicted winner won stage' : 'Result picked'}
          value={settlement?.mode === 'settled' ? (settlement.breakdown.outcomeCorrect ? '+100' : '+0') : pickComplete ? '+100 possible' : 'pending'}
          state={settlement?.mode === 'settled' ? settlement.breakdown.outcomeCorrect ? 'correct' : 'missed' : pickComplete ? 'correct' : 'pending'}
        />
        <ScoreLine
          label="Exact score"
          value={settlement?.mode === 'settled' ? (settlement.breakdown.exactCorrect ? '+40' : '+0') : pickComplete ? '+40 possible' : 'pending'}
          state={settlement?.mode === 'settled' ? settlement.breakdown.exactCorrect ? 'correct' : 'missed' : pickComplete ? 'partial' : 'pending'}
        />
        <ScoreLine
          label="Goal difference"
          value={settlement?.mode === 'settled' ? (settlement.breakdown.goalDifferenceCorrect ? '+20' : '+0') : pickComplete ? '+20 possible' : 'pending'}
          state={settlement?.mode === 'settled' ? settlement.breakdown.goalDifferenceCorrect ? 'correct' : 'missed' : pickComplete ? 'partial' : 'pending'}
        />
        <ScoreLine label="Autosave" value={isSignedIn ? 'on' : 'sign in'} state="pending" />
      </div>
    </aside>
  )
}

function MvpMatchRail({ context, score, settlement }) {
  const winner = score.homeScore === score.awayScore
    ? context.type === 'bracket'
      ? score.advancerTeam ? `${score.advancerTeam} advances after ET/pens` : 'Pick who advances after ET/pens'
      : score.touched ? 'Draw selected' : 'No result selected yet'
    : score.homeScore > score.awayScore
      ? context.home
      : context.away

  return (
    <div className="panel wide mvp-rail">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Pick summary</p>
          <h2>How this match affects your league</h2>
        </div>
        <span className="pill">Scores and bracket picks</span>
      </div>
      <div className="mvp-grid">
        <article>
          <strong>Current pick</strong>
          <p>{context.home} {score.homeScore}-{score.awayScore} {context.away}</p>
          <span>{winner}</span>
          {settlement?.mode === 'settled' && <em className={`points-chip ${settlement.state}`}>{settlement.label}</em>}
        </article>
        {settlement?.mode === 'settled' && (
          <article className={`settled-result-tile ${settlement.state}`}>
            <strong>Official result</strong>
            <p>{settlement.result.homeTeam} {settlement.result.homeScore}-{settlement.result.awayScore} {settlement.result.awayTeam}</p>
            <span>{settlement.points}/{settlement.total} points earned</span>
          </article>
        )}
        <article>
          <strong>League impact</strong>
          <p>Saved predictions will settle into private league and global leaderboards.</p>
          <span>Winner, exact score, goal difference, bracket, and awards.</span>
        </article>
      </div>
    </div>
  )
}

function ScoreLine({ label, value, state }) {
  const Icon = state === 'missed' ? X : state === 'pending' ? CircleHelp : Check
  return (
    <div className={`score-line ${state}`}>
      <span><Icon size={15} /> {label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function resultMatchesContext(result, context) {
  return Boolean(
    result
    && context
    && result.homeTeam === context.home
    && result.awayTeam === context.away,
  )
}

function ResultsView({
  matchSequence,
  fixtureRows,
  fixtureResults,
  awardResults,
  fixtureLocks,
  onSaveFixtureResult,
  onClearFixtureResult,
  onToggleFixtureLock,
  onSaveAwardResult,
  onClearAwardResult,
  resultStatus,
}) {
  const [selectedFixtureId, setSelectedFixtureId] = useState(matchSequence[0]?.id ?? '')
  const selectedContext = matchSequence.find((match) => match.id === selectedFixtureId) ?? matchSequence[0]
  const selectedStoredResult = selectedContext ? fixtureResults[selectedContext.id] : null
  const selectedResult = resultMatchesContext(selectedStoredResult, selectedContext) ? selectedStoredResult : null
  const selectedStaleResult = selectedStoredResult && !selectedResult ? selectedStoredResult : null
  const selectedLock = selectedContext ? fixtureLocks[selectedContext.id] : null
  const settledFixtureCount = Object.keys(fixtureResults).length
  const lockedFixtureCount = Object.keys(fixtureLocks).length
  const settledAwardCount = Object.keys(awardResults).length

  return (
    <section className="results-page">
      <div className="panel wide results-admin">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Admin settlement</p>
            <h2>Manual results fallback</h2>
          </div>
          <span className="pill">{settledFixtureCount} settled / {lockedFixtureCount} locked</span>
        </div>
        <div className="settlement-note">
          <strong>API-ready path</strong>
          <span>Manual results write to the same tables API-FOOTBALL sync can update later. League standings switch from draft points to settled points as results are saved.</span>
        </div>
        <div className="results-layout">
          <div className="fixture-picker">
            <div className="section-mini-head">
              <h3>Fixtures</h3>
              <span>{matchSequence.length} available</span>
            </div>
            <div className="fixture-list">
              {fixtureRows.map((match) => {
                const storedResult = fixtureResults[match.id]
                const result = resultMatchesContext(storedResult, match) ? storedResult : null
                const staleResult = storedResult && !result
                const locked = fixtureLocks[match.id]
                const isUnavailable = match.isReady === false
                return (
                  <button
                    className={`${selectedFixtureId === match.id ? 'selected' : ''} ${locked ? 'locked-fixture' : ''} ${staleResult ? 'stale-fixture' : ''} ${isUnavailable ? 'unavailable-fixture' : ''}`}
                    disabled={isUnavailable}
                    key={match.id}
                    onClick={() => {
                      if (!isUnavailable) setSelectedFixtureId(match.id)
                    }}
                    title={isUnavailable ? match.blockedReason : undefined}
                  >
                    <small>{match.stage}</small>
                    <span>{match.home === 'TBD' ? 'TBD' : <><TeamFlag team={match.home} /> {meta(match.home).code}</>}</span>
                    <strong>{isUnavailable ? 'waiting' : result ? `${result.homeScore}-${result.awayScore}` : staleResult ? 'stale' : 'unset'}</strong>
                    <span>{match.away === 'TBD' ? 'TBD' : <><TeamFlag team={match.away} /> {meta(match.away).code}</>}</span>
                    {(locked || staleResult || isUnavailable) && <em>{isUnavailable ? 'blocked' : staleResult ? 'needs reset' : 'locked'}</em>}
                  </button>
                )
              })}
            </div>
          </div>
          {selectedContext && (
            <FixtureResultEditor
              key={`${selectedContext.id}-${selectedContext.home}-${selectedContext.away}-${selectedResult?.updatedAt ?? 'new'}`}
              context={selectedContext}
              existingResult={selectedResult}
              staleResult={selectedStaleResult}
              existingLock={selectedLock}
              resultStatus={resultStatus}
              onSaveFixtureResult={onSaveFixtureResult}
              onClearFixtureResult={onClearFixtureResult}
              onToggleFixtureLock={onToggleFixtureLock}
            />
          )}
        </div>
      </div>

      <div className="panel wide results-admin">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Tournament awards</p>
            <h2>Manual award settlement</h2>
          </div>
          <span className="pill">{settledAwardCount}/{awards.length} settled</span>
        </div>
        <div className="award-result-grid">
          {awards.map((award) => (
            <AwardResultCard
              award={award}
              existingResult={awardResults[award.id]}
              key={`${award.id}-${awardResults[award.id]?.updatedAt ?? 'new'}`}
              resultStatus={resultStatus}
              onSaveAwardResult={onSaveAwardResult}
              onClearAwardResult={onClearAwardResult}
            />
          ))}
        </div>
        {(resultStatus.message || resultStatus.error) && (
          <p className={`auth-message ${resultStatus.error ? 'error' : ''}`}>
            {resultStatus.error || resultStatus.message}
          </p>
        )}
      </div>
    </section>
  )
}

function FixtureResultEditor({ context, existingResult, staleResult, existingLock, resultStatus, onSaveFixtureResult, onClearFixtureResult, onToggleFixtureLock }) {
  const [fixtureDraft, setFixtureDraft] = useState({
    homeScore: existingResult?.homeScore ?? 0,
    awayScore: existingResult?.awayScore ?? 0,
    advancerTeam: existingResult?.advancingTeam ?? '',
  })
  const needsAdvancer = context.type === 'bracket'
    && fixtureDraft.homeScore === fixtureDraft.awayScore
    && !fixtureDraft.advancerTeam

  function updateFixtureDraft(team, delta) {
    const key = team === context.home ? 'homeScore' : 'awayScore'
    setFixtureDraft((current) => {
      const next = { ...current, [key]: Math.max(0, current[key] + delta) }
      if (next.homeScore !== next.awayScore) next.advancerTeam = ''
      return next
    })
  }

  return (
    <div className="result-editor">
      <div className="section-mini-head">
        <h3>{context.stage}</h3>
        <span>
          {existingLock ? `Locked ${new Date(existingLock.lockedAt).toLocaleString()}` : 'Predictions open'}
          {' - '}
          {existingResult ? `Last saved ${new Date(existingResult.updatedAt).toLocaleString()}` : staleResult ? 'Saved result no longer matches this matchup' : 'No final result yet'}
        </span>
      </div>
      {staleResult && (
        <p className="auth-message error">
          Existing result is for {staleResult.homeTeam} {staleResult.homeScore}-{staleResult.awayScore} {staleResult.awayTeam}. Reset or save this fixture again for {context.home} vs {context.away}.
        </p>
      )}
      <div className="score-hero result-hero">
        <TeamBadge team={context.home} />
        <div className="score-center">
          <span className="pill live">Final score</span>
          <strong>{fixtureDraft.homeScore} - {fixtureDraft.awayScore}</strong>
          <small>{context.venue}</small>
        </div>
        <TeamBadge team={context.away} />
      </div>
      <div className="score-controls">
        {[context.home, context.away].map((team) => (
          <div className="stepper" key={team}>
            <span>{team}</span>
            <button onClick={() => updateFixtureDraft(team, -1)}><CircleMinus size={18} /></button>
            <strong>{team === context.home ? fixtureDraft.homeScore : fixtureDraft.awayScore}</strong>
            <button onClick={() => updateFixtureDraft(team, 1)}><CirclePlus size={18} /></button>
          </div>
        ))}
      </div>
      {context.type === 'bracket' && fixtureDraft.homeScore === fixtureDraft.awayScore && (
        <div className="advancer-picker">
          <div>
            <strong>Who advanced?</strong>
            <span>Required for tied knockout results after extra time or penalties.</span>
          </div>
          <div>
            {[context.home, context.away].map((team) => (
              <button
                className={fixtureDraft.advancerTeam === team ? 'selected' : ''}
                key={team}
                onClick={() => setFixtureDraft((current) => ({ ...current, advancerTeam: team }))}
              >
                <TeamBadge team={team} />
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="full-button"
        disabled={resultStatus.loading || needsAdvancer}
        onClick={() => onSaveFixtureResult(context, fixtureDraft)}
      >
        <ClipboardCheck size={16} /> Save final result
      </button>
      <div className="button-row result-actions">
        <button
          className="full-button secondary"
          disabled={resultStatus.loading || (!existingResult && !staleResult)}
          onClick={() => onClearFixtureResult(context)}
        >
          <X size={16} /> Reset to not played
        </button>
        <button
          className="full-button secondary"
          disabled={resultStatus.loading}
          onClick={() => onToggleFixtureLock(context)}
        >
          {existingLock ? <CircleMinus size={16} /> : <ClipboardCheck size={16} />}
          {existingLock ? 'Unlock picks' : 'Lock predictions'}
        </button>
      </div>
      {needsAdvancer && <p className="auth-message error">Choose who advanced before settling this knockout match.</p>}
    </div>
  )
}

function AwardResultCard({ award, existingResult, resultStatus, onSaveAwardResult, onClearAwardResult }) {
  const [recipient, setRecipient] = useState(existingResult?.recipient ?? '')
  return (
    <article className="award-result-card">
      <strong>{award.label}</strong>
      <span>{award.points} pts</span>
      {existingResult && <small>Official result: {existingResult.recipient}</small>}
      <input
        value={recipient}
        list={`award-result-${award.id}`}
        placeholder="Official recipient"
        onChange={(event) => setRecipient(event.target.value)}
      />
      <datalist id={`award-result-${award.id}`}>
        {awardCandidateCatalog
          .filter((candidate) => candidate.tags.includes(award.id))
          .map((candidate) => <option value={candidate.name} key={candidate.name} />)}
      </datalist>
      <button
        className="full-button secondary"
        disabled={resultStatus.loading || !recipient.trim()}
        onClick={() => onSaveAwardResult(award, recipient.trim())}
      >
        Save award
      </button>
      <button
        className="full-button secondary danger-lite"
        disabled={resultStatus.loading || !existingResult}
        onClick={() => onClearAwardResult(award)}
      >
        Reset award
      </button>
    </article>
  )
}

function AccountPanel({
  profile,
  draft,
  setDraft,
  onSave,
  lastSavedAt,
  predictionCount,
  hasSupabaseConfig,
  isSignedIn,
  authMode,
  setAuthMode,
  authForm,
  setAuthForm,
  authStatus,
  onAuthSubmit,
  onSignOut,
}) {
  return (
    <div className="panel account-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Account</p>
          <h2>{isSignedIn ? 'Profile' : 'Sign in to play with friends'}</h2>
        </div>
        <span className="pill"><UserRound size={14} /> {isSignedIn ? profile.displayName : 'Signed out'}</span>
      </div>
      {!hasSupabaseConfig && (
        <div className="auth-note">
          Add Supabase URL and anon key to enable accounts.
        </div>
      )}
      {hasSupabaseConfig && !isSignedIn && (
        <form className="auth-card" onSubmit={onAuthSubmit}>
          <div className="auth-tabs">
            <button type="button" className={authMode === 'sign-in' ? 'selected' : ''} onClick={() => setAuthMode('sign-in')}>Sign in</button>
            <button type="button" className={authMode === 'sign-up' ? 'selected' : ''} onClick={() => setAuthMode('sign-up')}>Create account</button>
          </div>
          <div className="form-grid">
            {authMode === 'sign-up' && (
              <label>
                Display name
                <input
                  value={authForm.displayName}
                  onChange={(event) => setAuthForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="Marco"
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </label>
          </div>
          <button className="full-button" type="submit" disabled={authStatus.loading}>
            <UserRound size={16} />
            {authStatus.loading ? 'Working...' : authMode === 'sign-up' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      )}
      {isSignedIn && (
        <div className="auth-card signed-in-card">
          <div>
            <strong>{profile.email}</strong>
            <span>Predictions and private leagues sync to your account.</span>
          </div>
          <button className="secondary" onClick={onSignOut} disabled={authStatus.loading}>Sign out</button>
        </div>
      )}
      {(authStatus.message || authStatus.error) && (
        <p className={`auth-message ${authStatus.error ? 'error' : ''}`}>
          {authStatus.error || authStatus.message}
        </p>
      )}
      <div className="form-grid">
        <label>
          Display name
          <input
            value={draft.displayName}
            onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
            disabled={!isSignedIn}
          />
        </label>
        <label>
          Email
          <input
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
            disabled={!isSignedIn}
          />
        </label>
      </div>
      <div className="account-summary">
        <span>{predictionCount} saved predictions</span>
        <span>{lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'No saved pick yet'}</span>
      </div>
      <button className="full-button" onClick={onSave} disabled={!isSignedIn}><Save size={16} /> Save profile</button>
    </div>
  )
}

function LeagueManager({
  league,
  leagueRows,
  leagueName,
  setLeagueName,
  inviteCode,
  setInviteCode,
  onCreate,
  onUpdateName,
  onJoin,
  onCopyInvite,
  leagueStatus,
  shareStatus,
  isSignedIn,
}) {
  const inviteUrl = leagueInviteUrl(league.inviteCode)
  return (
    <div className="panel league-manager">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Private leagues</p>
          <h2>{isSignedIn ? league.name : 'Create your first league'}</h2>
        </div>
        <span className="pill">{isSignedIn ? `${leagueRows.length} member${leagueRows.length === 1 ? '' : 's'}` : 'Account required'}</span>
      </div>
      {!isSignedIn && (
        <div className="auth-note">
          Sign in or create an account first. Private leagues, invite codes, and member standings sync through Supabase.
        </div>
      )}
      <div className="form-grid">
        <label>
          League name
          <input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} disabled={!isSignedIn} />
        </label>
        <label>
          Invite code
          <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} placeholder={isSignedIn ? league.inviteCode : 'Enter code after signing in'} disabled={!isSignedIn} />
        </label>
      </div>
      <div className="button-row">
        <button className="full-button" onClick={onCreate} disabled={!isSignedIn || leagueStatus.loading}><Sparkles size={16} /> Create league</button>
        <button className="full-button secondary" onClick={onUpdateName} disabled={!isSignedIn || !league.inviteCode || leagueStatus.loading}><Save size={16} /> Rename</button>
        <button className="full-button secondary" onClick={onJoin} disabled={!isSignedIn || leagueStatus.loading}><Users size={16} /> Join code</button>
        <button className="full-button secondary" onClick={onCopyInvite} disabled={!isSignedIn || !inviteUrl}><Copy size={16} /> Copy invite</button>
      </div>
      {inviteUrl && (
        <div className="invite-card">
          <span>Share link</span>
          <strong>{inviteUrl}</strong>
        </div>
      )}
      {(leagueStatus.message || leagueStatus.error || shareStatus) && (
        <p className={`auth-message ${leagueStatus.error ? 'error' : ''}`}>
          {leagueStatus.error || leagueStatus.message || shareStatus}
        </p>
      )}
      <div className="league-stats">
        <div>
          <strong>{leagueRows.length}</strong>
          <span>Members</span>
        </div>
        <div>
          <strong>{leagueRows.reduce((total, member) => total + member.savedPicks, 0)}</strong>
          <span>Saved picks</span>
        </div>
      </div>
    </div>
  )
}

function LeagueStandings({ league, rows, onViewPredictions }) {
  const isSettled = league.scoringMode === 'settled'
  return (
    <div className="panel league-standings">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{league.name}</p>
          <h2>League standings</h2>
        </div>
        <span className="pill">{isSettled ? 'Settled standings' : 'Draft standings'}</span>
      </div>
      {rows.length === 0 && (
        <div className="empty-state">Create a league or join one with an invite code.</div>
      )}
      {rows.map((member, index) => (
        <div className="league-member-row" key={member.id}>
          <span className="rank">{index + 1}</span>
          <div className="member-main">
            <strong>{member.displayName}</strong>
            <small>{member.role} - {member.savedPicks}/{member.targetPicks} picks saved</small>
            <div className="completion-track">
              <span style={{ width: `${member.percent}%` }} />
            </div>
          </div>
          <div className="member-score">
            <strong>{member.points}</strong>
            <span>{isSettled ? 'pts' : 'draft pts'}</span>
          </div>
          <button className="view-picks-button" onClick={() => onViewPredictions(member.id)}>
            <Eye size={15} /> View picks
          </button>
        </div>
      ))}
    </div>
  )
}

function LeagueActivity({ league }) {
  return (
    <aside className="panel league-activity-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">League feed</p>
          <h2>Activity</h2>
        </div>
      </div>
      <div className="activity-feed">
        {league.activity.length === 0 && <p>No league activity yet.</p>}
        {league.activity.slice(0, 8).map((activity) => (
          <p key={activity.id}>{activity.text}</p>
        ))}
      </div>
    </aside>
  )
}

function MemberPredictionModal({ member, scoringMode, matchSequence, fixtureResults, awardResults, onClose }) {
  const directPredictions = member.predictions ?? []
  const activityPredictions = predictionsFromActivity(member, matchSequence)
  const predictionMap = new Map(activityPredictions.map((prediction) => [prediction.fixtureId, prediction]))
  directPredictions.forEach((prediction) => predictionMap.set(prediction.fixtureId, prediction))
  const predictions = Array.from(predictionMap.values())
  const awardRows = member.awardPicks ?? []
  const groupStandings = standingsForPredictions(predictions)
  const actualGroupStandings = standingsForFixtureResults(fixtureResults)
  const groupsWithResults = settledGroupIds(fixtureResults)
  const bracketStages = bracketPredictionsByStage(predictions)
  const hasGroupPredictions = predictions.some((prediction) => prediction.fixtureType === 'group')
  const hasBracketPredictions = predictions.some((prediction) => prediction.fixtureType === 'bracket')
  const settledPredictions = predictions
    .map((prediction) => ({ prediction, settlement: settlementForPredictionView(prediction, fixtureResults) }))
    .filter((row) => row.settlement.mode === 'settled')
  const isSettled = scoringMode === 'settled'
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="panel member-modal">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Member picks</p>
            <h2>{member.displayName}</h2>
          </div>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>
        <div className="member-picks-overview">
          <div>
            <strong>{member.predictionCount ?? 0}</strong>
            <span>match picks</span>
          </div>
          <div>
            <strong>{member.awardCount ?? 0}</strong>
            <span>award picks</span>
          </div>
          <div>
            <strong>{member.points ?? 0}</strong>
            <span>{isSettled ? 'pts' : 'draft pts'}</span>
          </div>
        </div>
        <div className="member-pick-sections">
          <section>
            <div className="section-mini-head">
              <h3>Group tables</h3>
              <span>{hasGroupPredictions ? 'Projected from saved scores' : 'No saved group picks'}</span>
            </div>
            {!hasGroupPredictions && <p className="empty-state">No group-stage predictions saved yet.</p>}
            {hasGroupPredictions && (
              <>
                <div className="mini-group-grid">
                  {groups.map((group) => (
                    <article className="mini-group-card" key={group.id}>
                      <strong>Group {group.id}</strong>
                      {groupStandings[group.id].map((row, index) => {
                        const standingState = groupStandingState(group.id, row, index, actualGroupStandings, groupsWithResults)
                        return (
                        <div className={`mini-rank-row ${standingState}`} key={row.team}>
                          <span className="mini-rank">{index + 1}</span>
                          <TeamFlag team={row.team} />
                          <b>{row.pts}</b>
                          {standingState !== 'pending' && (
                            <small>{standingState === 'correct' ? 'Correct spot' : standingState === 'partial' ? 'Qualified' : 'Missed'}</small>
                          )}
                        </div>
                        )
                      })}
                    </article>
                  ))}
                </div>
                {settledPredictions.some(({ prediction }) => prediction.fixtureType === 'group') && (
                  <div className="mini-settlement-list">
                    {settledPredictions
                      .filter(({ prediction }) => prediction.fixtureType === 'group')
                      .map(({ prediction, settlement }) => (
                        <div className={`mini-settlement-card ${settlement.state}`} key={prediction.id}>
                          <TeamFlag team={prediction.homeTeam} />
                          <strong>{prediction.predictedHomeScore}-{prediction.predictedAwayScore}</strong>
                          <TeamFlag team={prediction.awayTeam} />
                          <span>{settlement.label}</span>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </section>
          <section>
            <div className="section-mini-head">
              <h3>Knockout bracket</h3>
              <span>{hasBracketPredictions ? 'Flag view' : 'No saved knockout picks'}</span>
            </div>
            {!hasBracketPredictions && <p className="empty-state">No knockout predictions saved yet.</p>}
            {hasBracketPredictions && (
              <div className="mini-bracket-grid">
                {bracketStages.map(([stage, stagePredictions]) => (
                  <div className="mini-bracket-stage" key={stage}>
                    <strong>{stage}</strong>
                    {stagePredictions.length === 0 && <span className="mini-empty">TBD</span>}
                    {stagePredictions.map((prediction) => {
                      const settlement = settlementForPredictionView(prediction, fixtureResults)
                      return (
                      <div className={`mini-bracket-card ${settlement.mode === 'settled' ? `settled ${settlement.state}` : ''}`} key={prediction.id} title={scoreKey(prediction)}>
                        <TeamFlag team={prediction.homeTeam} />
                        <b>{prediction.predictedHomeScore}</b>
                        <span>-</span>
                        <b>{prediction.predictedAwayScore}</b>
                        <TeamFlag team={prediction.awayTeam} />
                        <small>{settlement.mode === 'settled' ? settlement.label : prediction.advancingTeam ? `${meta(prediction.advancingTeam).code} advances` : 'Pending'}</small>
                      </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <div className="section-mini-head">
              <h3>Awards</h3>
              <span>{awardRows.length ? `${awardRows.length}/${awards.length} picked` : 'No saved awards'}</span>
            </div>
            {awardRows.length === 0 && <p className="empty-state">No award picks saved yet.</p>}
            {awardRows.length > 0 && (
              <div className="mini-awards-grid">
                {awardRows.map((awardPick) => {
                  const award = awards.find((item) => item.id === awardPick.awardKey) ?? { id: awardPick.awardKey, points: 0 }
                  const settlement = awardSettlementView(award, awardPick, awardResults)
                  return (
                  <div className={settlement.mode === 'settled' ? `settled ${settlement.state}` : ''} key={awardPick.awardKey}>
                    <strong>{awardPick.awardLabel}</strong>
                    <span>{awardPick.recipient}</span>
                    <small>{settlement.mode === 'settled' ? settlement.label : 'Pending'}</small>
                  </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function AwardsView({ selectedAward, setSelectedAward, awardPicks, awardResults, onSaveAwardPick, awardSaveStatus, isSignedIn, isLocked, lockLabel }) {
  const [awardQuery, setAwardQuery] = useState('')
  const activeAward = awards.find((award) => award.id === selectedAward) ?? awards[0]
  const searchMeta = awardSearchMeta[activeAward.id] ?? awardSearchMeta.potm
  const cleanQuery = awardQuery.trim()
  const normalizedQuery = cleanQuery.toLowerCase()
  const activeCandidates = useMemo(() => {
    const eligible = awardCandidateCatalog.filter((candidate) => {
      const awardEligible = candidate.tags.includes(activeAward.id)
      const positionEligible = !searchMeta.position || candidate.position === searchMeta.position
      return awardEligible && positionEligible
    })
    const filtered = normalizedQuery
      ? eligible.filter((candidate) => (
        candidate.name.toLowerCase().includes(normalizedQuery)
        || candidate.team.toLowerCase().includes(normalizedQuery)
        || candidate.position.toLowerCase().includes(normalizedQuery)
      ))
      : eligible
    return filtered.slice(0, 18)
  }, [activeAward.id, normalizedQuery, searchMeta.position])
  const exactEligibleCandidate = activeCandidates.find((candidate) => candidate.name.toLowerCase() === normalizedQuery)
  const knownButBlocked = Boolean(searchMeta.position && cleanQuery && awardCandidateCatalog.some((candidate) => (
    candidate.position !== searchMeta.position
    && (
      candidate.name.toLowerCase().includes(normalizedQuery)
      || normalizedQuery.includes(candidate.name.toLowerCase())
    )
  )))
  const canUseCustom = Boolean(cleanQuery && !exactEligibleCandidate && !knownButBlocked)

  function chooseAwardRecipient(recipient) {
    if (isLocked) return
    onSaveAwardPick(activeAward, recipient)
    setAwardQuery('')
  }

  return (
    <section className="page-grid">
      <div className="panel wide">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Tournament-long bonuses</p>
            <h2>Awards predictions</h2>
          </div>
          <span className={`pill ${isLocked ? 'locked-pill' : ''}`}>{isLocked ? lockLabel : isSignedIn ? 'Syncs to account' : 'Sign in to sync'}</span>
        </div>
        <div className="award-grid">
          {awards.map((award) => (
            <button
              className={`award-card ${selectedAward === award.id ? 'selected' : ''} ${awardSettlementView(award, awardPicks[award.id], awardResults).mode === 'settled' ? `settled ${awardSettlementView(award, awardPicks[award.id], awardResults).state}` : ''}`}
              key={award.id}
              onClick={() => setSelectedAward(award.id)}
            >
              <Medal size={18} />
              <span>{award.label}</span>
              <strong>{awardPicks[award.id]?.recipient ?? 'No pick yet'}</strong>
              <small>{awardResults[award.id] ? `${awardSettlementView(award, awardPicks[award.id], awardResults).label} - ${awardSettlementView(award, awardPicks[award.id], awardResults).detail}` : `${award.points} pts - ${awardPicks[award.id] ? 'saved' : 'open'}`}</small>
            </button>
          ))}
        </div>
        <div className="recipient-panel">
          <div>
            <p className="eyebrow">Pick recipient</p>
            <h3>{activeAward.label}</h3>
            <span>{activeAward.points} points if correct</span>
          </div>
          <div className="award-search-row">
            <label className="award-search">
              <span>Search</span>
              <input
                value={awardQuery}
                onChange={(event) => setAwardQuery(event.target.value)}
                placeholder={searchMeta.placeholder}
                disabled={isLocked}
              />
            </label>
            <div className="award-picked">
              <span>Current pick</span>
              <strong>{awardPicks[activeAward.id]?.recipient ?? 'No pick yet'}</strong>
            </div>
          </div>
          <p className="award-helper">{searchMeta.helper}</p>
          {isLocked && (
            <p className="save-message error">Awards are locked. Picks can no longer be changed.</p>
          )}
          <div className="recipient-list">
            {activeCandidates.map((candidate) => (
              <button
                key={`${candidate.name}-${candidate.team}`}
                className={awardPicks[activeAward.id]?.recipient === candidate.name ? 'selected' : ''}
                onClick={() => chooseAwardRecipient(candidate.name)}
                disabled={isLocked || awardSaveStatus.loading}
              >
                <strong>{candidate.name}</strong>
                <span>{candidate.team} - {candidate.position}</span>
              </button>
            ))}
            {canUseCustom && (
              <button
                className="custom-recipient"
                onClick={() => chooseAwardRecipient(cleanQuery)}
                disabled={isLocked || awardSaveStatus.loading}
              >
                <strong>{searchMeta.customLabel}</strong>
                <span>{cleanQuery}</span>
              </button>
            )}
          </div>
          {knownButBlocked && (
            <p className="save-message error">
              {activeAward.label === 'Golden Glove'
                ? 'That saved candidate is not listed as a goalkeeper.'
                : 'That candidate is not eligible for this award list.'}
            </p>
          )}
          {!activeCandidates.length && !canUseCustom && !knownButBlocked && (
            <p className="empty-state">No matching candidates yet.</p>
          )}
          {(awardSaveStatus.message || awardSaveStatus.error) && (
            <p className={`save-message ${awardSaveStatus.error ? 'error' : ''}`}>
              {awardSaveStatus.error || awardSaveStatus.message}
            </p>
          )}
        </div>
      </div>
      <aside className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Impact</p>
            <h2>Awards can swing leagues</h2>
          </div>
        </div>
        <div className="points-stack">
          <ScoreLine label="Match picks" value="pending" state="pending" />
          <ScoreLine label="Bracket path" value="pending" state="pending" />
          <ScoreLine label="Awards picked" value={`${Object.keys(awardPicks).length}/${awards.length}`} state={Object.keys(awardPicks).length === awards.length ? 'correct' : 'pending'} />
        </div>
      </aside>
    </section>
  )
}

export default App
