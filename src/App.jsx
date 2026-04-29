import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  CalendarClock,
  Check,
  ChevronRight,
  CircleHelp,
  CircleMinus,
  CirclePlus,
  Code2,
  Medal,
  Radio,
  RefreshCw,
  Save,
  Sparkles,
  UserRound,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import { apiNotes, awards, friends, groupMatchEvents, groups, liveEvents, teamMeta } from './data'
import { appConfig, hasSupabaseConfig, productionChecklist, runtimeMode } from './lib/config'
import { footballProviderReadiness } from './lib/football'
import { betaStore } from './lib/localBetaStore'

const navItems = [
  { id: 'groups', label: 'Groups', icon: BarChart3 },
  { id: 'bracket', label: 'Bracket', icon: Trophy },
  { id: 'match', label: 'Match', icon: Radio },
  { id: 'leagues', label: 'Leagues', icon: Users },
  { id: 'awards', label: 'Awards', icon: Medal },
  { id: 'api', label: 'Production', icon: Code2 },
]

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

const defaultMatchContext = {
  id: 'A-1',
  type: 'group',
  stage: 'Group A',
  home: 'Mexico',
  away: 'South Africa',
  venue: 'Group opener',
  date: 'Jun 11 - prediction open',
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
  const [view, setView] = useState('groups')
  const [profile, setProfile] = useState(() => betaStore.loadProfile())
  const [profileDraft, setProfileDraft] = useState(() => betaStore.loadProfile())
  const [league, setLeague] = useState(() => betaStore.loadLeague())
  const [leagueName, setLeagueName] = useState(() => betaStore.loadLeague().name)
  const [inviteCode, setInviteCode] = useState('')
  const [predictionCount, setPredictionCount] = useState(() => betaStore.countPredictions())
  const [lastSavedAt, setLastSavedAt] = useState(() => betaStore.lastSavedAt())
  const [groupScores, setGroupScores] = useState(() => betaStore.loadGroupScores(initialGroupScores))
  const [bracketScores, setBracketScores] = useState(() => betaStore.loadBracketScores())
  const [selectedAward, setSelectedAward] = useState('potm')
  const [matchContext, setMatchContext] = useState(defaultMatchContext)

  useEffect(() => {
    betaStore.saveGroupScores(groupScores)
  }, [groupScores])

  useEffect(() => {
    betaStore.saveBracketScores(bracketScores)
  }, [bracketScores])

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
    const final = [{ id: 'final-0', a: sf[0]?.picked, b: sf[1]?.picked, state: 'pending', fallbackHome: 0, fallbackAway: 0 }]
    final[0].state = matchState(final[0])
    final[0].picked = winner(final[0], 0, 0)
    const thirdPlace = [{
      id: 'third-0',
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
      ['Final', final],
      ['3rd Place', thirdPlace],
    ]
  }, [playableQualifierBySeed, bracketScores])

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
  const isKnockoutTie = matchContext.type === 'bracket' && activeScore.homeScore === activeScore.awayScore
  const pickComplete = matchContext.type === 'group'
    ? activeScore.touched
    : activeScore.homeScore !== activeScore.awayScore || Boolean(activeScore.advancerTeam)
  const projectedPoints = pickComplete ? 160 : 0

  function openMatch(context) {
    setMatchContext(context)
    setView('match')
    scrollToTop()
  }

  function goToAdjacentMatch(direction) {
    const groupContexts = groupMatchups.map((match) => ({
      id: match.id,
      type: 'group',
      stage: `Group ${match.group}`,
      home: match.home,
      away: match.away,
      venue: match.venue,
      date: `${match.date} - prediction open`,
      events: groupMatchEvents,
      backView: 'groups',
    }))
    const knockoutContexts = bracketRounds.flatMap(([round, matches]) =>
      matches
        .filter((match) => match.a?.team && match.b?.team)
        .map((match) => ({
          id: match.id,
          type: 'bracket',
          stage: round,
          home: match.a.team,
          away: match.b.team,
          venue: round === 'Final' ? 'New York New Jersey Stadium' : round === '3rd Place' ? 'Hard Rock Stadium' : 'Mercedes-Benz Stadium',
          date: 'Sat, Jul 4 - 9:00 PM',
          events: liveEvents,
          backView: 'bracket',
          fallbackHome: match.fallbackHome,
          fallbackAway: match.fallbackAway,
        })),
    )
    const sequence = [...groupContexts, ...knockoutContexts]
    const currentIndex = sequence.findIndex((match) => match.id === matchContext.id)
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + direction + sequence.length) % sequence.length
    openMatch(sequence[nextIndex])
  }

  function updateScore(team, delta) {
    const key = team === matchContext.home ? 'homeScore' : 'awayScore'
    const updater = (currentScore) => {
      const nextScore = {
        ...currentScore,
        [key]: Math.max(0, currentScore[key] + delta),
        touched: true,
      }
      if (nextScore.homeScore !== nextScore.awayScore) delete nextScore.advancerTeam
      return nextScore
    }
    if (matchContext.type === 'group') {
      setGroupScores((current) => ({ ...current, [matchContext.id]: updater(current[matchContext.id]) }))
    } else {
      setBracketScores((current) => ({
        ...current,
        [matchContext.id]: updater(current[matchContext.id] ?? {
          home: matchContext.home,
          away: matchContext.away,
          homeScore: matchContext.fallbackHome ?? 2,
          awayScore: matchContext.fallbackAway ?? 1,
        }),
      }))
    }
  }

  function pickAdvancer(team) {
    if (matchContext.type !== 'bracket') return
    setBracketScores((current) => ({
      ...current,
      [matchContext.id]: {
        ...current[matchContext.id],
        home: matchContext.home,
        away: matchContext.away,
        homeScore: activeScore.homeScore,
        awayScore: activeScore.awayScore,
        touched: true,
        advancerTeam: team,
      },
    }))
  }

  function markCurrentScoreTouched() {
    if (matchContext.type === 'group') {
      setGroupScores((current) => ({
        ...current,
        [matchContext.id]: {
          ...current[matchContext.id],
          touched: true,
        },
      }))
    } else {
      setBracketScores((current) => ({
        ...current,
        [matchContext.id]: {
          ...current[matchContext.id],
          home: matchContext.home,
          away: matchContext.away,
          homeScore: activeScore.homeScore,
          awayScore: activeScore.awayScore,
          touched: true,
        },
      }))
    }
  }

  function saveProfile() {
    const nextProfile = betaStore.saveProfile(profileDraft)
    setProfile(nextProfile)
    setProfileDraft(nextProfile)
    setLeague(betaStore.loadLeague())
  }

  function createLeague() {
    setLeague(betaStore.createLeague(leagueName, profile))
  }

  function joinLeague() {
    setLeague(betaStore.joinLeague(inviteCode, profile))
    setInviteCode('')
  }

  function saveCurrentPrediction(locked = false) {
    markCurrentScoreTouched()
    betaStore.savePrediction({
      profile,
      context: matchContext,
      score: activeScore,
      locked,
    })
    setPredictionCount(betaStore.countPredictions())
    setLastSavedAt(betaStore.lastSavedAt())
    setLeague(betaStore.loadLeague())
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Trophy size={22} /></span>
          <div>
            <strong>MyMundial</strong>
            <small>World Cup 2026</small>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
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
          <span>{runtimeMode === 'local-beta' ? 'Local beta mode' : 'Supabase ready'}</span>
          <strong>{predictionCount}</strong>
          <small>saved predictions</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Prediction studio</p>
            <h1>MyMundial V1: scores, brackets, private leagues, and awards</h1>
          </div>
          <div className="top-actions">
            <button onClick={() => setView('leagues')}><Users size={16} /> {league.name}</button>
            <button className="primary" onClick={() => saveCurrentPrediction(true)}><Sparkles size={16} /> Lock draft</button>
          </div>
        </header>

        {view !== 'match' && (
          <div className="status-strip">
            <div><strong>48</strong><span>teams loaded</span></div>
            <div><strong>{groupMatchups.length}</strong><span>group matches</span></div>
            <div><strong>{runtimeMode === 'local-beta' ? 'Local' : 'Live'}</strong><span>persistence mode</span></div>
            <div><strong>{projectedPoints}</strong><span>active pick points</span></div>
          </div>
        )}

        {view === 'groups' && (
          <GroupsView standings={standings} openMatch={openMatch} groupScores={groupScores} />
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
                    {matches.map((match, matchIndex) => (
                      <button
                        className={`match-card ${match.state}`}
                        key={match.id}
                        style={{ '--slot-row': bracketSlotRow(roundIndex, matchIndex) }}
                        disabled={!match.a?.team || !match.b?.team}
                        onClick={() => openMatch({
                          id: match.id,
                          type: 'bracket',
                          stage: round,
                          home: match.a?.team ?? 'TBD',
                          away: match.b?.team ?? 'TBD',
                          venue: round === 'Final' ? 'New York New Jersey Stadium' : round === '3rd Place' ? 'Hard Rock Stadium' : 'Mercedes-Benz Stadium',
                          date: 'Sat, Jul 4 - 9:00 PM',
                          events: liveEvents,
                          backView: 'bracket',
                          fallbackHome: match.fallbackHome,
                          fallbackAway: match.fallbackAway,
                        })}
                      >
                        <MatchTeam slot={match.a?.team && match.b?.team ? match.a : undefined} score={(bracketScores[match.id]?.homeScore ?? match.fallbackHome)} picked={match.picked?.team === match.a?.team} />
                        <MatchTeam slot={match.a?.team && match.b?.team ? match.b : undefined} score={(bracketScores[match.id]?.awayScore ?? match.fallbackAway)} picked={match.picked?.team === match.b?.team} />
                        <span className="match-state">{match.state}</span>
                      </button>
                    ))}
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
              projectedPoints={projectedPoints}
              context={matchContext}
              onBack={() => setView(matchContext.backView)}
              onPreviousMatch={() => goToAdjacentMatch(-1)}
              onNextMatch={() => goToAdjacentMatch(1)}
              onSavePrediction={() => saveCurrentPrediction(false)}
              onPickAdvancer={pickAdvancer}
              pickComplete={pickComplete}
              isKnockoutTie={isKnockoutTie}
            />
            <MvpMatchRail context={matchContext} score={activeScore} />
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
              />
              <LeagueManager
                league={league}
                leagueName={leagueName}
                setLeagueName={setLeagueName}
                inviteCode={inviteCode}
                setInviteCode={setInviteCode}
                onCreate={createLeague}
                onJoin={joinLeague}
              />
            </div>
            <Leaderboard title="League standings" subtitle={league.name} rows={friends} />
            <Leaderboard title="Global leaderboard" subtitle="Overall World Cup rank" rows={[...friends].sort((a, b) => b.total - a.total)} global />
          </section>
        )}

        {view === 'awards' && (
          <AwardsView selectedAward={selectedAward} setSelectedAward={setSelectedAward} />
        )}

        {view === 'api' && <ApiView />}
      </section>
    </main>
  )
}

function bracketSlotRow(roundIndex, matchIndex) {
  if (roundIndex === 4) return 19
  if (roundIndex === 5) return 25
  const spacing = 2 ** roundIndex
  const offset = Math.max(1, spacing)
  return 3 + (matchIndex * spacing * 2) + offset
}

function GroupsView({ standings, openMatch, groupScores }) {
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
                  return (
                    <button
                      className="group-match"
                      key={match.id}
                      onClick={() => openMatch({
                        id: match.id,
                        type: 'group',
                        stage: `Group ${match.group}`,
                        home: match.home,
                        away: match.away,
                        venue: match.venue,
                        date: `${match.date} - prediction open`,
                        events: groupMatchEvents,
                        backView: 'groups',
                      })}
                    >
                      <TeamBadge team={match.home} />
                      <strong>{score.homeScore} - {score.awayScore}</strong>
                      <TeamBadge team={match.away} />
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

function MatchTeam({ slot, score, picked }) {
  if (!slot) return <div className="match-team muted">TBD</div>
  return (
    <div className="match-team">
      <TeamBadge team={slot.team} seed={slot.seed} />
      <strong>{score}</strong>
      {picked && <Check size={14} />}
    </div>
  )
}

function MatchPanel({ score, updateScore, projectedPoints, context, onBack, onPreviousMatch, onNextMatch, onSavePrediction, onPickAdvancer, pickComplete, isKnockoutTie, compact = false }) {
  return (
    <aside className={`panel match-detail ${compact ? 'compact' : ''}`}>
      <div className="match-meta">
        <button onClick={onBack}><ChevronRight size={16} /> Back to {context.backView === 'groups' ? 'Groups' : 'Bracket'}</button>
        <span><CalendarClock size={15} /> {context.date}</span>
      </div>
      <div className="match-jump">
        <button onClick={onPreviousMatch}>Previous match</button>
        <button className="primary-lite" onClick={onNextMatch}>Next match</button>
      </div>
      <div className="score-hero">
        <TeamBadge team={context.home} />
        <div className="score-center">
          <span className="pill live">{context.stage} - prediction</span>
          <strong>{score.homeScore} - {score.awayScore}</strong>
          <small>{context.venue}</small>
        </div>
        <TeamBadge team={context.away} />
      </div>
      <div className="score-controls">
        {[context.home, context.away].map((team) => (
          <div className="stepper" key={team}>
            <span>{team}</span>
            <button onClick={() => updateScore(team, -1)}><CircleMinus size={18} /></button>
            <strong>{team === context.home ? score.homeScore : score.awayScore}</strong>
            <button onClick={() => updateScore(team, 1)}><CirclePlus size={18} /></button>
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
              <button className={score.advancerTeam === team ? 'selected' : ''} key={team} onClick={() => onPickAdvancer(team)}>
                <TeamBadge team={team} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="points-banner">
        <Sparkles size={16} />
        Projected lock value: {projectedPoints} pts
      </div>
      <button className="save-pick" onClick={onSavePrediction} disabled={context.type === 'bracket' && !pickComplete}>
        <Save size={16} />
        {context.type === 'bracket' && !pickComplete ? 'Pick advancer first' : 'Save prediction'}
      </button>
      <div className="points-stack">
        <ScoreLine label={context.type === 'bracket' ? 'Advancer picked' : 'Result picked'} value={pickComplete ? '+100' : 'pending'} state={pickComplete ? 'correct' : 'pending'} />
        <ScoreLine label="Exact score" value={pickComplete ? '+40' : 'pending'} state={pickComplete ? 'partial' : 'pending'} />
        <ScoreLine label="Goal difference" value={pickComplete ? '+20' : 'pending'} state={pickComplete ? 'partial' : 'pending'} />
        <ScoreLine label="Result settlement" value="API sync" state="pending" />
      </div>
      <div className="event-list">
        {context.events.map((event) => (
          <div className={`event-row ${event.state}`} key={`${event.time}-${event.detail}`}>
            <span>{event.time}</span>
            <strong>{event.type}</strong>
            <p>{event.detail}</p>
            <em>{event.score}</em>
          </div>
        ))}
      </div>
    </aside>
  )
}

function MvpMatchRail({ context, score }) {
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
          <p className="eyebrow">V1 launch scope</p>
          <h2>Score pick and settlement path</h2>
        </div>
        <span className="pill">No player props in MVP</span>
      </div>
      <div className="mvp-grid">
        <article>
          <strong>Current pick</strong>
          <p>{context.home} {score.homeScore}-{score.awayScore} {context.away}</p>
          <span>{winner}</span>
        </article>
        <article>
          <strong>Server validation</strong>
          <p>API-FOOTBALL sync will normalize fixtures, scores, standings, and final results.</p>
          <span>Provider key stays in Supabase Edge Function secrets.</span>
        </article>
        <article>
          <strong>League impact</strong>
          <p>Saved predictions will settle into private league and global leaderboards.</p>
          <span>Winner, exact score, goal difference, bracket, and awards.</span>
        </article>
      </div>
      <div className="deferred-card">
        <Medal size={18} />
        <div>
          <strong>Post-MVP player layer</strong>
          <p>Lineups, scorer picks, MOTM, and live player events are intentionally deferred until the core app is shipped.</p>
        </div>
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

function Leaderboard({ title, subtitle, rows, global = false }) {
  return (
    <div className="panel leaderboard">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{subtitle}</p>
          <h2>{title}</h2>
        </div>
        <span className="pill">{global ? 'Public' : 'Invite-only'}</span>
      </div>
      {rows.map((row, index) => (
        <div className="leader-row" key={row.name}>
          <span className="rank">{index + 1}</span>
          <div>
            <strong>{row.name}</strong>
            <small>{row.exact} exact scores - {row.status}</small>
          </div>
          <span>{row.round}</span>
          <span>{row.awards}</span>
          <strong>{row.total}</strong>
        </div>
      ))}
    </div>
  )
}

function AccountPanel({ profile, draft, setDraft, onSave, lastSavedAt, predictionCount }) {
  return (
    <div className="panel account-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Account foundation</p>
          <h2>Beta profile</h2>
        </div>
        <span className="pill"><UserRound size={14} /> {profile.displayName}</span>
      </div>
      <div className="form-grid">
        <label>
          Display name
          <input
            value={draft.displayName}
            onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
          />
        </label>
        <label>
          Email
          <input
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
      </div>
      <div className="account-summary">
        <span>{predictionCount} saved predictions</span>
        <span>{lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}` : 'No saved pick yet'}</span>
      </div>
      <button className="full-button" onClick={onSave}><Save size={16} /> Save beta profile</button>
    </div>
  )
}

function LeagueManager({ league, leagueName, setLeagueName, inviteCode, setInviteCode, onCreate, onJoin }) {
  return (
    <div className="panel league-manager">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Private leagues</p>
          <h2>{league.name}</h2>
        </div>
        <span className="pill">{league.inviteCode}</span>
      </div>
      <div className="form-grid">
        <label>
          League name
          <input value={leagueName} onChange={(event) => setLeagueName(event.target.value)} />
        </label>
        <label>
          Invite code
          <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder={league.inviteCode} />
        </label>
      </div>
      <div className="button-row">
        <button className="full-button" onClick={onCreate}><Sparkles size={16} /> Create league</button>
        <button className="full-button secondary" onClick={onJoin}><Users size={16} /> Join code</button>
      </div>
      <div className="member-list">
        {league.members.map((member) => (
          <div key={member.id}>
            <strong>{member.displayName}</strong>
            <span>{member.role}</span>
          </div>
        ))}
      </div>
      <div className="activity-feed">
        {league.activity.slice(0, 4).map((activity) => (
          <p key={activity.id}>{activity.text}</p>
        ))}
      </div>
    </div>
  )
}

function AwardsView({ selectedAward, setSelectedAward }) {
  return (
    <section className="page-grid">
      <div className="panel wide">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Tournament-long bonuses</p>
            <h2>Awards predictions</h2>
          </div>
          <span className="pill">Locks before kickoff</span>
        </div>
        <div className="award-grid">
          {awards.map((award) => (
            <button className={`award-card ${selectedAward === award.id ? 'selected' : ''}`} key={award.id} onClick={() => setSelectedAward(award.id)}>
              <Medal size={18} />
              <span>{award.label}</span>
              <strong>{award.pick}</strong>
              <small>{award.points} pts - {award.state}</small>
            </button>
          ))}
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
          <ScoreLine label="Awards pending" value="+440" state="pending" />
        </div>
      </aside>
    </section>
  )
}

function ApiView() {
  return (
    <section className="page-grid">
      <div className="panel wide">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Production foundation</p>
            <h2>Supabase and football data adapters</h2>
          </div>
          <span className="pill live"><Activity size={14} /> {runtimeMode}</span>
        </div>
        <div className="readiness-grid">
          {productionChecklist.map((item) => (
            <div className="readiness-card" key={item.label}>
              <strong>{item.label}</strong>
              <span>{item.state}</span>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="api-map">
          {footballProviderReadiness.resources.map((item) => (
            <div key={item}>
              <Code2 size={16} />
              <strong>{item}</strong>
              <span>normalized table</span>
            </div>
          ))}
        </div>
        <div className="provider-grid">
          {footballProviderReadiness.trials.map((provider) => (
            <article key={provider.id}>
              <strong>{provider.label}</strong>
              <span>{provider.status}</span>
              <p>{provider.strengths}</p>
              <small>{provider.nextCheck}</small>
            </article>
          ))}
        </div>
        <div className="note-list">
          {apiNotes.map((note) => <p key={note}>{note}</p>)}
          <p>Supabase schema: supabase/migrations/202604280001_initial_schema.sql</p>
          <p>Sync function scaffold: supabase/functions/sync-football-data</p>
        </div>
      </div>
      <aside className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Beta launch gates</p>
            <h2>What must become real</h2>
          </div>
        </div>
        <div className="check-list">
          <span><Check size={16} /> Local saved predictions</span>
          <span><Check size={16} /> Local beta leagues</span>
          <span><Check size={16} /> Normalized schema drafted</span>
          <span><RefreshCw size={16} /> Provider trials pending keys</span>
          <span><CircleHelp size={16} /> Supabase project not connected</span>
        </div>
        <div className="config-card">
          <strong>Runtime config</strong>
          <span>Supabase: {hasSupabaseConfig ? 'configured' : 'missing env'}</span>
          <span>Provider: {appConfig.dataProvider}</span>
        </div>
      </aside>
    </section>
  )
}

export default App
