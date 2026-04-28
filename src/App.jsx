import { useMemo, useState } from 'react'
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
  MousePointer2,
  Radio,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import { apiNotes, awards, friends, groupMatchEvents, groups, lineups, liveEvents, teamMeta } from './data'

const navItems = [
  { id: 'groups', label: 'Groups', icon: BarChart3 },
  { id: 'bracket', label: 'Bracket', icon: Trophy },
  { id: 'match', label: 'Match', icon: Radio },
  { id: 'leagues', label: 'Leagues', icon: Users },
  { id: 'awards', label: 'Awards', icon: Medal },
  { id: 'api', label: 'Data API', icon: Code2 },
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

function fallbackLineup(team) {
  const code = meta(team).code
  return [
    ['1', `${code} Keeper`, 'GK', 0, 5, 3],
    ['2', `${code} RB`, 'RB', 0, 4, 1],
    ['4', `${code} CB`, 'CB', 1, 4, 2],
    ['5', `${code} CB`, 'CB', 0, 4, 4],
    ['3', `${code} LB`, 'LB', 0, 4, 5],
    ['6', `${code} DM`, 'DM', 1, 3, 2],
    ['8', `${code} CM`, 'CM', 2, 3, 4],
    ['10', `${code} AM`, 'AM', 3, 2, 3],
    ['7', `${code} RW`, 'RW', 4, 1, 1],
    ['9', `${code} ST`, 'ST', 6, 1, 3],
    ['11', `${code} LW`, 'LW', 4, 1, 5],
  ]
}

function playerTeam(playerName, teams) {
  return teams.find((team) => (lineups[team] ?? fallbackLineup(team)).some(([, name]) => name === playerName))
}

function countScorersForTeam(scorers, team, teams) {
  return scorers.filter((playerName) => playerTeam(playerName, teams) === team).length
}

function App() {
  const [view, setView] = useState('groups')
  const [groupScores, setGroupScores] = useState(initialGroupScores)
  const [bracketScores, setBracketScores] = useState({})
  const [selectedAward, setSelectedAward] = useState('potm')
  const [pickMode, setPickMode] = useState('scorer')
  const [scorers, setScorers] = useState([])
  const [motm, setMotm] = useState('')
  const [matchContext, setMatchContext] = useState(defaultMatchContext)

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

    function winner(match, fallbackHome, fallbackAway) {
      const score = scoreFor(match, fallbackHome, fallbackAway)
      if (!match.a || !match.b || !score) return undefined
      if (score.homeScore === score.awayScore) return undefined
      return score.homeScore > score.awayScore ? match.a : match.b
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
        state: bracketScores[`r32-${index}`] ? 'picked' : 'pending',
        fallbackHome: 0,
        fallbackAway: 0,
      }
    })
    r32.forEach((match) => { match.picked = winner(match, match.fallbackHome, match.fallbackAway) })
    const r16 = Array.from({ length: 8 }, (_, index) => ({
      id: `r16-${index}`,
      a: r32[index * 2]?.picked,
      b: r32[index * 2 + 1]?.picked,
      state: bracketScores[`r16-${index}`] ? 'picked' : 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    r16.forEach((match) => { match.picked = winner(match, match.fallbackHome, match.fallbackAway) })
    const qf = Array.from({ length: 4 }, (_, index) => ({
      id: `qf-${index}`,
      a: r16[index * 2]?.picked,
      b: r16[index * 2 + 1]?.picked,
      state: bracketScores[`qf-${index}`] ? 'picked' : 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    qf.forEach((match) => { match.picked = winner(match, match.fallbackHome, match.fallbackAway) })
    const sf = Array.from({ length: 2 }, (_, index) => ({
      id: `sf-${index}`,
      a: qf[index * 2]?.picked,
      b: qf[index * 2 + 1]?.picked,
      state: 'pending',
      fallbackHome: 0,
      fallbackAway: 0,
    }))
    sf.forEach((match) => { match.picked = winner(match, match.fallbackHome, match.fallbackAway) })
    const final = [{ id: 'final-0', a: sf[0]?.picked, b: sf[1]?.picked, state: 'pending', fallbackHome: 0, fallbackAway: 0 }]
    final[0].picked = winner(final[0], 0, 0)
    return [
      ['R32', r32],
      ['R16', r16],
      ['QF', qf],
      ['SF', sf],
      ['Final', final],
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
  const scoreTotal = activeScore.homeScore + activeScore.awayScore
  const projectedPoints = (activeScore.homeScore === activeScore.awayScore ? 0 : 100) + (activeScore.homeScore === 2 && activeScore.awayScore === 1 ? 40 : 0) + scorers.length * 15 + (motm ? 35 : 0)

  function openMatch(context) {
    setMatchContext(context)
    setScorers([])
    setMotm('')
    setPickMode('scorer')
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
          venue: round === 'Final' ? 'New York New Jersey Stadium' : 'Mercedes-Benz Stadium',
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
      const updater = (currentScore) => ({
      ...currentScore,
      [key]: Math.max(0, currentScore[key] + delta),
      touched: true,
    })
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

  function handlePlayerPick(playerName, team) {
    if (pickMode === 'motm') {
      setMotm(playerName)
      return
    }
    const teamGoals = team === matchContext.home ? activeScore.homeScore : activeScore.awayScore
    if (teamGoals < 1) return
    setScorers((current) => {
      if (current.includes(playerName)) return current.filter((item) => item !== playerName)
      const alreadyPickedForTeam = countScorersForTeam(current, team, [matchContext.home, matchContext.away])
      if (alreadyPickedForTeam >= teamGoals) return current
      if (current.length >= scoreTotal) return current
      return [...current, playerName]
    })
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Trophy size={22} /></span>
          <div>
            <strong>CupCall</strong>
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
          <span>Live test points</span>
          <strong>{1240 + projectedPoints}</strong>
          <small>Global rank 2,318</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Prediction studio</p>
            <h1>World Cup bracket, group stage, and live match picks</h1>
          </div>
          <div className="top-actions">
            <button><Users size={16} /> Private league</button>
            <button className="primary"><Sparkles size={16} /> Lock draft</button>
          </div>
        </header>

        <div className="status-strip">
          <div><strong>48</strong><span>teams loaded</span></div>
          <div><strong>{groupMatchups.length}</strong><span>group matches</span></div>
          <div><strong>32</strong><span>knockout slots</span></div>
          <div><strong>{projectedPoints}</strong><span>match points preview</span></div>
        </div>

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
                    {matches.map((match) => (
                      <button
                        className={`match-card ${match.state}`}
                        key={match.id}
                        disabled={!match.a?.team || !match.b?.team}
                        onClick={() => openMatch({
                          id: match.id,
                          type: 'bracket',
                          stage: round,
                          home: match.a?.team ?? 'TBD',
                          away: match.b?.team ?? 'TBD',
                          venue: round === 'Final' ? 'New York New Jersey Stadium' : 'Mercedes-Benz Stadium',
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
              scorers={scorers}
            />
            <div className="panel wide">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Player-level picks</p>
                  <h2>Pick scorers and MOTM from the lineup</h2>
                </div>
                <span className="pill">{scorers.length}/{scoreTotal} scorers selected</span>
              </div>
              <div className="pick-console">
                <button className={pickMode === 'scorer' ? 'active-chip' : ''} onClick={() => setPickMode('scorer')}><MousePointer2 size={15} /> Add scorers</button>
                <button className={pickMode === 'motm' ? 'active-chip' : ''} onClick={() => setPickMode('motm')}><Medal size={15} /> Set MOTM</button>
                <div>
                  <span>Scorers: {scorers.length ? scorers.join(', ') : 'none'}</span>
                  <span>MOTM: {motm || 'none selected'}</span>
                </div>
              </div>
              <LineupBoard
                teams={[matchContext.home, matchContext.away]}
                scorers={scorers}
                motm={motm}
                pickMode={pickMode}
                onPlayerPick={handlePlayerPick}
                score={activeScore}
                context={matchContext}
              />
            </div>
          </section>
        )}

        {view === 'leagues' && (
          <section className="page-grid">
            <Leaderboard title="Private league" subtitle="Marco's bracket room" rows={friends} />
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

function MatchPanel({ score, updateScore, projectedPoints, context, onBack, onPreviousMatch, onNextMatch, scorers = [], compact = false }) {
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
      <div className="points-banner">
        <Sparkles size={16} />
        Projected lock value: {projectedPoints} pts
      </div>
      <div className="points-stack">
        <ScoreLine label="Winner picked" value={score.homeScore === score.awayScore ? 'pending' : '+100'} state={score.homeScore === score.awayScore ? 'pending' : 'correct'} />
        <ScoreLine label="Exact score" value={score.homeScore === 2 && score.awayScore === 1 ? '+40' : 'pending'} state={score.homeScore === 2 && score.awayScore === 1 ? 'partial' : 'pending'} />
        <ScoreLine label="Predicted scorers" value={scorers.length ? `+${scorers.length * 15}` : 'pending'} state={scorers.length ? 'correct' : 'pending'} />
        <ScoreLine label="Real event mismatch" value="0" state="missed" />
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

function ScoreLine({ label, value, state }) {
  const Icon = state === 'missed' ? X : state === 'pending' ? CircleHelp : Check
  return (
    <div className={`score-line ${state}`}>
      <span><Icon size={15} /> {label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function LineupBoard({ teams, scorers, motm, pickMode, onPlayerPick, score, context }) {
  return (
    <div className="lineup-board">
      {teams.map((team) => (
        <div className="lineup-side" key={team}>
          <div className="lineup-title">
            <TeamBadge team={team} />
            <span>4-2-3-1</span>
          </div>
          <div className="pitch">
            {(lineups[team] ?? fallbackLineup(team)).map(([number, name, position, goals, row, col]) => {
              const teamGoals = team === context.home ? score.homeScore : score.awayScore
              const teamScorerCount = countScorersForTeam(scorers, team, teams)
              const disabledScorer = pickMode === 'scorer' && teamGoals < 1
              const cappedScorer = pickMode === 'scorer' && !scorers.includes(name) && teamScorerCount >= teamGoals
              const renderedCol = 6 - col
              return (
              <button
                className={`player-node ${scorers.includes(name) ? 'scorer-pick' : ''} ${motm === name ? 'motm-pick' : ''} ${disabledScorer || cappedScorer ? 'disabled-pick' : ''}`}
                style={{ gridRow: row, gridColumn: renderedCol }}
                key={`${team}-${number}`}
                onClick={() => onPlayerPick(name, team)}
                disabled={disabledScorer || cappedScorer}
                title={disabledScorer ? `${team} has no predicted goals` : cappedScorer ? `${team} already has ${teamGoals} scorer pick${teamGoals === 1 ? '' : 's'}` : `Pick ${name}`}
              >
                <strong>{number}</strong>
                <span>{name}</span>
                <small>{position} - {goals}G</small>
                {(scorers.includes(name) || motm === name) && <em>{motm === name ? 'MOTM' : pickMode === 'scorer' ? 'Goal' : 'Pick'}</em>}
              </button>
              )
            })}
          </div>
        </div>
      ))}
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
            <p className="eyebrow">Provider plan</p>
            <h2>API-ready data adapter</h2>
          </div>
          <span className="pill live"><Activity size={14} /> Mock now, Sportmonks-shaped later</span>
        </div>
        <div className="api-map">
          {['fixtures', 'groups', 'standings', 'lineups', 'events', 'players', 'brackets', 'leaderboards'].map((item) => (
            <div key={item}>
              <Code2 size={16} />
              <strong>{item}</strong>
              <span>mapped resource</span>
            </div>
          ))}
        </div>
        <div className="note-list">
          {apiNotes.map((note) => <p key={note}>{note}</p>)}
        </div>
      </div>
      <aside className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Fallbacks</p>
            <h2>What to verify</h2>
          </div>
        </div>
        <div className="check-list">
          <span><Check size={16} /> World Cup fixtures now</span>
          <span><Check size={16} /> Group standings</span>
          <span><Check size={16} /> Lineups and formations</span>
          <span><Check size={16} /> Live goals, cards, subs</span>
          <span><CircleHelp size={16} /> Latency and licensing</span>
        </div>
      </aside>
    </section>
  )
}

export default App
