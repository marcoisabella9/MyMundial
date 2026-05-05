import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import {
  CalendarClock,
  Check,
  Copy,
  Medal,
  Radio,
  Save,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { awards, teamMeta } from '../data'

const colors = {
  ink: '#102019',
  muted: '#65736b',
  green: '#0f8f4f',
  greenSoft: '#e8f8ee',
  lime: '#37e27f',
  gold: '#f1c94a',
  red: '#d94b3e',
  paper: '#fbfdfc',
  line: '#dce6df',
  dark: '#07120e',
}

const heroMatch = { home: 'United States', away: 'Paraguay', stage: 'Group D', score: [1, 0], points: 140 }

const flagCodes = {
  Mexico: 'mx',
  'South Africa': 'za',
  'United States': 'us',
  Paraguay: 'py',
  Spain: 'es',
  Germany: 'de',
}

const leagueRows = [
  { name: 'Marco', picks: 84, points: 1280, progress: 92 },
  { name: 'Nina', picks: 79, points: 1210, progress: 86 },
  { name: 'Sam', picks: 73, points: 1125, progress: 80 },
  { name: 'Ari', picks: 68, points: 1040, progress: 74 },
]

const features = [
  { icon: Radio, label: 'Group scores', value: '48 open' },
  { icon: Trophy, label: 'Bracket path', value: 'Auto-built' },
  { icon: Medal, label: 'Awards', value: 'Bonus points' },
  { icon: Users, label: 'Private leagues', value: 'Invite-only' },
]

function teamCode(team) {
  return teamMeta[team]?.code ?? team.slice(0, 3).toUpperCase()
}

function teamColor(team) {
  return teamMeta[team]?.color ?? colors.green
}

function clampProgress(frame, start, duration) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
}

function fade(frame, start, duration = 18) {
  return clampProgress(frame, start, duration)
}

function pop(frame, _fps, delay, duration = 18) {
  return interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
}

function BrandMark({ size = 72 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: 18,
      background: colors.green,
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      boxShadow: '0 20px 44px rgba(15, 143, 79, 0.24)',
    }}>
      <Trophy size={size * 0.48} strokeWidth={2.8} />
    </div>
  )
}

function Pill({ children, tone = 'green' }) {
  const palette = tone === 'gold'
    ? { bg: '#fff5cf', fg: '#8a6500' }
    : tone === 'dark'
      ? { bg: '#102019', fg: '#eafff2' }
      : { bg: colors.greenSoft, fg: colors.green }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 999,
      padding: '10px 16px',
      background: palette.bg,
      color: palette.fg,
      fontSize: 23,
      fontWeight: 850,
      lineHeight: 1,
    }}>
      {children}
    </span>
  )
}

function TeamChip({ team, align = 'left', compact = false }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      gap: compact ? 9 : 12,
      minWidth: 0,
      overflow: 'hidden',
    }}>
      <Img
        src={`https://flagcdn.com/w80/${flagCodes[team] ?? 'un'}.png`}
        style={{
          width: compact ? 34 : 40,
          height: compact ? 24 : 28,
          flex: '0 0 auto',
          borderRadius: 5,
          objectFit: 'cover',
          background: `linear-gradient(135deg, ${teamColor(team)}, #ffffff 160%)`,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
        }}
      />
      <strong style={{ flex: '0 0 auto', fontSize: compact ? 24 : 28, color: colors.ink }}>{teamCode(team)}</strong>
      <span style={{
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: compact ? 19 : 24,
        color: colors.muted,
      }}>
        {team}
      </span>
    </div>
  )
}

function ScoreStepper({ label, score, progress }) {
  const scoreSlide = interpolate(progress, [0, 1], [24, 0])
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) 68px',
      alignItems: 'center',
      gap: 12,
      border: `1px solid ${colors.line}`,
      borderRadius: 14,
      padding: '14px 16px',
      background: '#fff',
    }}>
      <TeamChip team={label} compact />
      <strong style={{
        width: 68,
        height: 58,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 12,
        background: colors.greenSoft,
        color: colors.green,
        fontSize: 38,
        transform: `translateY(${scoreSlide}px)`,
        opacity: progress,
      }}>
        {score}
      </strong>
    </div>
  )
}

function PhoneFrame({ frame }) {
  const match = heroMatch
  const pickProgress = clampProgress(frame, 24, 52)
  const saveProgress = clampProgress(frame, 76, 30)
  const bracketCue = clampProgress(frame, 102, 24)

  return (
    <div style={{
      width: 590,
      height: 760,
      borderRadius: 44,
      background: colors.dark,
      padding: 16,
      boxShadow: '0 38px 95px rgba(7, 18, 14, 0.32)',
    }}>
      <div style={{
        height: '100%',
        borderRadius: 30,
        background: 'linear-gradient(180deg, #ffffff, #f5faf7)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateRows: '86px 1fr',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: `1px solid ${colors.line}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandMark size={42} />
            <strong style={{ fontSize: 25, color: colors.ink }}>MyMundial</strong>
          </div>
          <span style={{
            borderRadius: 999,
            background: colors.greenSoft,
            color: colors.green,
            padding: '8px 12px',
            fontSize: 18,
            fontWeight: 850,
            lineHeight: 1,
          }}>
            {match.stage}
          </span>
        </div>

        <div style={{ padding: 24, display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <p style={{ margin: 0, color: colors.green, fontSize: 18, fontWeight: 850, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Make your pick
            </p>
            <h2 style={{ margin: 0, color: colors.ink, fontSize: 32, lineHeight: 1.04 }}>
              {match.home} vs {match.away}
            </h2>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <ScoreStepper label={match.home} score={match.score[0]} progress={pickProgress} />
            <ScoreStepper label={match.away} score={match.score[1]} progress={pickProgress} />
          </div>

          <div style={{
            display: 'grid',
            gap: 10,
            border: `1px solid ${colors.line}`,
            borderRadius: 14,
            background: '#fff',
            padding: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20 }}>
              <span style={{ color: colors.muted }}>Winner picked</span>
              <strong style={{ color: colors.green }}>{match.home}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20 }}>
              <span style={{ color: colors.muted }}>Exact score bonus</span>
              <strong style={{ color: '#a76a00' }}>+40</strong>
            </div>
            <div style={{
              height: 8,
              borderRadius: 999,
              background: '#edf3ef',
              overflow: 'hidden',
            }}>
              <span style={{
                display: 'block',
                width: `${interpolate(saveProgress, [0, 1], [24, 100])}%`,
                height: '100%',
                background: colors.green,
              }} />
            </div>
          </div>

          <div style={{
            minHeight: 56,
            borderRadius: 14,
            background: saveProgress > 0.82 ? colors.green : colors.greenSoft,
            color: saveProgress > 0.82 ? '#fff' : colors.green,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontSize: 23,
            fontWeight: 850,
          }}>
            {saveProgress > 0.82 ? <Check size={28} /> : <Save size={28} />}
            {saveProgress > 0.82 ? 'Prediction saved' : 'Save prediction'}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'center',
            gap: 12,
            minHeight: 64,
            border: `1px solid ${colors.line}`,
            borderRadius: 14,
            background: '#fff',
            padding: '12px 16px',
            opacity: bracketCue,
            transform: `translateY(${interpolate(bracketCue, [0, 1], [18, 0])}px)`,
          }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={{ color: colors.green, fontSize: 14, fontWeight: 850, letterSpacing: 1.1, textTransform: 'uppercase' }}>
                Bracket impact
              </span>
              <strong style={{ color: colors.ink, fontSize: 21 }}>
                USA moves into R32 path
              </strong>
            </div>
            <Trophy size={28} color={colors.gold} />
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroScene({ frame, fps, brandName, tagline }) {
  const titleIn = pop(frame, fps, 0, 18)
  const phoneIn = pop(frame, fps, 18, 18)
  const bridge = clampProgress(frame, 108, 24)

  return (
    <AbsoluteFill style={{ ...sceneBase(), gridTemplateColumns: '1fr 660px', gap: 70 }}>
      <PitchLines frame={frame} />
      <div style={{ alignSelf: 'center', zIndex: 2, transform: `translateY(${(1 - titleIn) * 44}px)`, opacity: titleIn }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 34 }}>
          <BrandMark />
          <Pill tone="dark"><CalendarClock size={26} /> World Cup 2026</Pill>
        </div>
        <h1 style={{
          margin: 0,
          width: 930,
          color: colors.ink,
          fontSize: 116,
          lineHeight: 0.92,
          letterSpacing: 0,
        }}>
          {brandName}
        </h1>
        <p style={{
          margin: '28px 0 0',
          width: 790,
          color: colors.muted,
          fontSize: 42,
          lineHeight: 1.12,
        }}>
          {tagline}
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 42 }}>
          {features.slice(0, 3).map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={feature.label} style={{
                opacity: fade(frame, 34 + index * 8),
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                border: `1px solid ${colors.line}`,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.88)',
                padding: '14px 18px',
                color: colors.ink,
                fontSize: 23,
                fontWeight: 800,
              }}>
                <Icon size={26} color={colors.green} />
                {feature.label}
              </div>
            )
          })}
        </div>
      </div>
      <div style={{
        zIndex: 2,
        transform: `translateY(${(1 - phoneIn) * 70 - bridge * 22}px) rotate(${interpolate(phoneIn, [0, 1], [-4, 0])}deg)`,
        opacity: phoneIn,
      }}>
        <PhoneFrame frame={frame} />
      </div>
      <div style={{
        position: 'absolute',
        zIndex: 1,
        right: 62,
        top: 112,
        width: 430,
        height: 760,
        border: `2px solid rgba(15, 143, 79, ${0.12 * bridge})`,
        borderRadius: 36,
        transform: `translateX(${interpolate(bridge, [0, 1], [80, 0])}px)`,
        opacity: bridge,
      }} />
    </AbsoluteFill>
  )
}

function BracketScene({ frame, fps }) {
  const intro = pop(frame, fps, -6, 12)
  const rows = [
    ['MEX', 'USA', 'R32'],
    ['BRA', 'ESP', 'R16'],
    ['FRA', 'ARG', 'QF'],
    ['POR', 'ENG', 'SF'],
    ['ESP', 'FRA', 'Final'],
  ]

  return (
    <AbsoluteFill style={{ ...sceneBase(), gridTemplateColumns: '640px 1fr', gap: 64 }}>
      <PitchLines frame={frame + 55} />
      <div style={{ alignSelf: 'center', zIndex: 2, transform: `translateY(${(1 - intro) * 32}px)`, opacity: intro }}>
        <Pill tone="gold"><Trophy size={26} /> Dynamic bracket</Pill>
        <h2 style={{ margin: '28px 0 22px', color: colors.ink, fontSize: 74, lineHeight: 0.96 }}>
          Your group picks build the knockout path.
        </h2>
        <p style={{ margin: 0, color: colors.muted, fontSize: 32, lineHeight: 1.18 }}>
          Predict winners, draw scores, and who advances after extra time or penalties.
        </p>
      </div>
      <div style={{
        position: 'relative',
        zIndex: 2,
        alignSelf: 'center',
        height: 720,
        border: `1px solid ${colors.line}`,
        borderRadius: 26,
        background: 'rgba(255,255,255,0.92)',
        padding: 38,
        boxShadow: '0 30px 80px rgba(29, 48, 39, 0.12)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 22, height: '100%' }}>
          {rows.map((round, roundIndex) => (
            <div key={round[2]} style={{ display: 'grid', alignContent: 'center', gap: 22 }}>
              <Pill>{round[2]}</Pill>
              {[0, 1, 2].slice(0, roundIndex > 2 ? 1 : 2).map((_, matchIndex) => {
                const reveal = pop(frame, fps, -4 + roundIndex * 4 + matchIndex * 2, 10)
                return (
                  <div key={`${round[2]}-${matchIndex}`} style={{
                    opacity: reveal,
                    transform: `translateX(${(1 - reveal) * -36}px)`,
                    border: `1px solid ${roundIndex === 4 ? colors.gold : colors.line}`,
                    borderRadius: 14,
                    background: roundIndex === 4 ? '#fffbea' : '#fff',
                    padding: 16,
                    boxShadow: '0 12px 26px rgba(24, 43, 34, 0.06)',
                  }}>
                    <BracketTeam code={round[matchIndex % 2]} active />
                    <BracketTeam code={round[(matchIndex + 1) % 2]} />
                    <span style={{ color: colors.muted, fontSize: 17 }}>
                      {roundIndex === 4 ? 'Champion pick' : 'Tap to predict'}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}

function BracketTeam({ code, active = false }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 42,
      color: active ? colors.green : colors.ink,
      fontSize: 26,
      fontWeight: 850,
    }}>
      <span>{code}</span>
      <span>{active ? '2' : '1'}</span>
    </div>
  )
}

function LeaguesScene({ frame, fps }) {
  const cardIn = pop(frame, fps, -6, 12)

  return (
    <AbsoluteFill style={{ ...sceneBase(), gridTemplateColumns: '1fr 760px', gap: 64 }}>
      <PitchLines frame={frame + 110} />
      <div style={{ zIndex: 2, alignSelf: 'center', opacity: cardIn }}>
        <Pill><Users size={28} /> Private leagues</Pill>
        <h2 style={{ margin: '28px 0 22px', color: colors.ink, fontSize: 82, lineHeight: 0.94 }}>
          Invite friends. Compare every pick.
        </h2>
        <p style={{ margin: 0, width: 760, color: colors.muted, fontSize: 32, lineHeight: 1.18 }}>
          Share a league link, watch saved-pick progress, and see standings shift as results come in.
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: 640,
          marginTop: 42,
          border: `1px solid ${colors.line}`,
          borderRadius: 16,
          background: '#fff',
          padding: 18,
          color: colors.ink,
          fontSize: 23,
          fontWeight: 800,
        }}>
          <Copy size={28} color={colors.green} />
          mymundial.app?invite=FINALS26
        </div>
      </div>

      <div style={{
        zIndex: 2,
        alignSelf: 'center',
        border: `1px solid ${colors.line}`,
        borderRadius: 28,
        background: 'rgba(255,255,255,0.94)',
        padding: 32,
        boxShadow: '0 30px 80px rgba(29, 48, 39, 0.13)',
        transform: `translateY(${(1 - cardIn) * 44}px)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <p style={{ margin: 0, color: colors.green, fontSize: 18, fontWeight: 850, letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Friends league
            </p>
            <h3 style={{ margin: '6px 0 0', color: colors.ink, fontSize: 40 }}>Finals Trip Crew</h3>
          </div>
          <Pill>4 members</Pill>
        </div>

        <div style={{ display: 'grid', gap: 13 }}>
          {leagueRows.map((row, index) => {
            const reveal = pop(frame, fps, -2 + index * 3, 10)
            const bar = interpolate(reveal, [0, 1], [0, row.progress])
            return (
              <div key={row.name} style={{
                opacity: reveal,
                transform: `translateX(${(1 - reveal) * 34}px)`,
                display: 'grid',
                gridTemplateColumns: '48px 1fr 116px',
                alignItems: 'center',
                gap: 18,
                border: `1px solid ${colors.line}`,
                borderRadius: 16,
                background: index === 0 ? colors.greenSoft : '#fff',
                padding: 18,
              }}>
                <span style={{
                  width: 44,
                  height: 44,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 999,
                  background: index === 0 ? colors.green : '#edf7f0',
                  color: index === 0 ? '#fff' : colors.green,
                  fontSize: 23,
                  fontWeight: 850,
                }}>
                  {index + 1}
                </span>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 27, fontWeight: 850, color: colors.ink }}>
                    <span>{row.name}</span>
                    <span>{row.picks}/91 picks</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: '#edf3ef', overflow: 'hidden', marginTop: 10 }}>
                    <span style={{ display: 'block', width: `${bar}%`, height: '100%', background: colors.green }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', color: colors.ink, fontSize: 34 }}>{row.points}</strong>
                  <span style={{ color: colors.muted, fontSize: 18 }}>pts</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AbsoluteFill>
  )
}

function AwardsScene({ frame, fps }) {
  const titleIn = pop(frame, fps, -6, 12)
  const visibleAwards = awards.slice(0, 4)

  return (
    <AbsoluteFill style={{ ...sceneBase(), gridTemplateColumns: '710px 1fr', gap: 64 }}>
      <PitchLines frame={frame + 180} />
      <div style={{ zIndex: 2, alignSelf: 'center', opacity: titleIn }}>
        <Pill tone="gold"><Sparkles size={28} /> More ways to win</Pill>
        <h2 style={{ margin: '28px 0 22px', color: colors.ink, fontSize: 78, lineHeight: 0.95 }}>
          Add tournament awards and bonus picks.
        </h2>
        <p style={{ margin: 0, color: colors.muted, fontSize: 32, lineHeight: 1.18 }}>
          Golden Boot, Player of the Tournament, Golden Glove, and Best Young Player all matter.
        </p>
      </div>
      <div style={{
        zIndex: 2,
        alignSelf: 'center',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 18,
      }}>
        {visibleAwards.map((award, index) => {
          const reveal = pop(frame, fps, -2 + index * 4, 10)
          return (
            <div key={award.id} style={{
              opacity: reveal,
              transform: `translateY(${(1 - reveal) * 44}px)`,
              minHeight: 230,
              border: `1px solid ${index === 0 ? colors.gold : colors.line}`,
              borderRadius: 20,
              background: index === 0 ? '#fffbea' : '#fff',
              padding: 26,
              display: 'grid',
              alignContent: 'space-between',
              boxShadow: '0 16px 40px rgba(24, 43, 34, 0.07)',
            }}>
              <Medal size={38} color={index === 0 ? '#a76a00' : colors.green} />
              <div>
                <h3 style={{ margin: '28px 0 10px', color: colors.ink, fontSize: 32, lineHeight: 1 }}>
                  {award.label}
                </h3>
                <p style={{ margin: 0, color: colors.muted, fontSize: 24 }}>{award.pick}</p>
              </div>
              <strong style={{ color: colors.green, fontSize: 28 }}>{award.points} pts</strong>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

function FinalScene({ frame, fps, brandName }) {
  const inValue = pop(frame, fps, -6, 14)

  return (
    <AbsoluteFill style={{ ...sceneBase(), placeItems: 'center', textAlign: 'center' }}>
      <PitchLines frame={frame + 240} />
      <div style={{ zIndex: 2, width: 1160, opacity: inValue, transform: `scale(${interpolate(inValue, [0, 1], [0.94, 1])})` }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
          <BrandMark size={92} />
        </div>
        <h2 style={{ margin: 0, color: colors.ink, fontSize: 110, lineHeight: 0.94 }}>
          {brandName}
        </h2>
        <p style={{ margin: '28px auto 0', width: 920, color: colors.muted, fontSize: 38, lineHeight: 1.16 }}>
          Make every match matter before kickoff.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 46 }}>
          <Pill><Radio size={27} /> Predict</Pill>
          <Pill tone="gold"><Trophy size={27} /> Compete</Pill>
          <Pill tone="dark"><Users size={27} /> With friends</Pill>
        </div>
      </div>
    </AbsoluteFill>
  )
}

function PitchLines({ frame }) {
  const drift = interpolate(frame, [0, 480], [0, -120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      background: `
        radial-gradient(circle at 18% 10%, rgba(55, 226, 127, 0.16), transparent 28%),
        radial-gradient(circle at 92% 76%, rgba(241, 201, 74, 0.16), transparent 26%),
        linear-gradient(135deg, #f8fbf8 0%, #f2f7f4 58%, #eef5f0 100%)
      `,
    }}>
      <div style={{
        position: 'absolute',
        left: -120,
        right: -120,
        top: drift,
        bottom: drift,
        opacity: 0.42,
        backgroundImage: `
          linear-gradient(90deg, rgba(15,143,79,0.15) 1px, transparent 1px),
          linear-gradient(0deg, rgba(15,143,79,0.12) 1px, transparent 1px)
        `,
        backgroundSize: '160px 160px',
      }} />
      <div style={{
        position: 'absolute',
        width: 760,
        height: 760,
        border: '2px solid rgba(15, 143, 79, 0.12)',
        borderRadius: 999,
        right: -210,
        top: 160,
      }} />
      <div style={{
        position: 'absolute',
        width: 980,
        height: 520,
        border: '2px solid rgba(15, 143, 79, 0.12)',
        borderRadius: 40,
        left: -370,
        bottom: -80,
      }} />
    </div>
  )
}

function sceneBase() {
  return {
    display: 'grid',
    padding: '88px 118px',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: colors.ink,
  }
}

export function LaunchVideo({ brandName, tagline }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ background: colors.paper }}>
      <Sequence durationInFrames={138}>
        <HeroScene frame={frame} fps={fps} brandName={brandName} tagline={tagline} />
      </Sequence>
      <Sequence from={138} durationInFrames={88}>
        <BracketScene frame={frame - 138} fps={fps} />
      </Sequence>
      <Sequence from={226} durationInFrames={86}>
        <LeaguesScene frame={frame - 226} fps={fps} />
      </Sequence>
      <Sequence from={312} durationInFrames={88}>
        <AwardsScene frame={frame - 312} fps={fps} />
      </Sequence>
      <Sequence from={400} durationInFrames={80}>
        <FinalScene frame={frame - 400} fps={fps} brandName={brandName} />
      </Sequence>
    </AbsoluteFill>
  )
}
