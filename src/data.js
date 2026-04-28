export const groups = [
  { id: 'A', teams: ['Mexico', 'South Africa', 'South Korea', 'Czechia'] },
  { id: 'B', teams: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'] },
  { id: 'C', teams: ['Brazil', 'Morocco', 'Haiti', 'Scotland'] },
  { id: 'D', teams: ['United States', 'Paraguay', 'Australia', 'Turkiye'] },
  { id: 'E', teams: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'] },
  { id: 'F', teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'] },
  { id: 'G', teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'] },
  { id: 'H', teams: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'] },
  { id: 'I', teams: ['France', 'Senegal', 'Norway', 'Iraq'] },
  { id: 'J', teams: ['Argentina', 'Algeria', 'Austria', 'Jordan'] },
  { id: 'K', teams: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'] },
  { id: 'L', teams: ['England', 'Croatia', 'Ghana', 'Panama'] },
]

export const teamMeta = {
  Mexico: { code: 'MEX', flag: '🇲🇽', color: '#0f8f4f' },
  'South Africa': { code: 'RSA', flag: '🇿🇦', color: '#f0b429' },
  'South Korea': { code: 'KOR', flag: '🇰🇷', color: '#d91e36' },
  Czechia: { code: 'CZE', flag: '🇨🇿', color: '#2454a6' },
  Canada: { code: 'CAN', flag: '🇨🇦', color: '#d9232e' },
  'Bosnia and Herzegovina': { code: 'BIH', flag: '🇧🇦', color: '#1b5cb8' },
  Qatar: { code: 'QAT', flag: '🇶🇦', color: '#8a1538' },
  Switzerland: { code: 'SUI', flag: '🇨🇭', color: '#e21b2d' },
  Brazil: { code: 'BRA', flag: '🇧🇷', color: '#229e45' },
  Morocco: { code: 'MAR', flag: '🇲🇦', color: '#c1272d' },
  Haiti: { code: 'HAI', flag: '🇭🇹', color: '#21468b' },
  Scotland: { code: 'SCO', flag: '🏴', color: '#005eb8' },
  'United States': { code: 'USA', flag: '🇺🇸', color: '#1b3f8b' },
  Paraguay: { code: 'PAR', flag: '🇵🇾', color: '#d52b1e' },
  Australia: { code: 'AUS', flag: '🇦🇺', color: '#ffcd00' },
  Turkiye: { code: 'TUR', flag: '🇹🇷', color: '#e30a17' },
  Germany: { code: 'GER', flag: '🇩🇪', color: '#171717' },
  Curacao: { code: 'CUW', flag: '🇨🇼', color: '#2c69b5' },
  'Ivory Coast': { code: 'CIV', flag: '🇨🇮', color: '#f58220' },
  Ecuador: { code: 'ECU', flag: '🇪🇨', color: '#fcd116' },
  Netherlands: { code: 'NED', flag: '🇳🇱', color: '#ff6f1a' },
  Japan: { code: 'JPN', flag: '🇯🇵', color: '#bc002d' },
  Sweden: { code: 'SWE', flag: '🇸🇪', color: '#006aa7' },
  Tunisia: { code: 'TUN', flag: '🇹🇳', color: '#e70013' },
  Belgium: { code: 'BEL', flag: '🇧🇪', color: '#fdda24' },
  Egypt: { code: 'EGY', flag: '🇪🇬', color: '#ce1126' },
  Iran: { code: 'IRN', flag: '🇮🇷', color: '#239f40' },
  'New Zealand': { code: 'NZL', flag: '🇳🇿', color: '#111827' },
  Spain: { code: 'ESP', flag: '🇪🇸', color: '#c60b1e' },
  'Cape Verde': { code: 'CPV', flag: '🇨🇻', color: '#003893' },
  'Saudi Arabia': { code: 'KSA', flag: '🇸🇦', color: '#006c35' },
  Uruguay: { code: 'URU', flag: '🇺🇾', color: '#75aadb' },
  France: { code: 'FRA', flag: '🇫🇷', color: '#1f4aa8' },
  Senegal: { code: 'SEN', flag: '🇸🇳', color: '#00853f' },
  Norway: { code: 'NOR', flag: '🇳🇴', color: '#ba0c2f' },
  Iraq: { code: 'IRQ', flag: '🇮🇶', color: '#ce1126' },
  Argentina: { code: 'ARG', flag: '🇦🇷', color: '#74acdf' },
  Algeria: { code: 'ALG', flag: '🇩🇿', color: '#006233' },
  Austria: { code: 'AUT', flag: '🇦🇹', color: '#ed2939' },
  Jordan: { code: 'JOR', flag: '🇯🇴', color: '#007a3d' },
  Portugal: { code: 'POR', flag: '🇵🇹', color: '#006600' },
  'DR Congo': { code: 'COD', flag: '🇨🇩', color: '#007fff' },
  Uzbekistan: { code: 'UZB', flag: '🇺🇿', color: '#1eb53a' },
  Colombia: { code: 'COL', flag: '🇨🇴', color: '#fcd116' },
  England: { code: 'ENG', flag: '🏴', color: '#c8102e' },
  Croatia: { code: 'CRO', flag: '🇭🇷', color: '#171796' },
  Ghana: { code: 'GHA', flag: '🇬🇭', color: '#fcd116' },
  Panama: { code: 'PAN', flag: '🇵🇦', color: '#005293' },
}

export const scorerPool = [
  { name: 'Lamine Yamal', team: 'Spain', goals: 7, assists: 9, form: 'Hot' },
  { name: 'Alvaro Morata', team: 'Spain', goals: 11, assists: 3, form: 'Starter' },
  { name: 'Pedri', team: 'Spain', goals: 4, assists: 8, form: 'Creator' },
  { name: 'Florian Wirtz', team: 'Germany', goals: 10, assists: 12, form: 'Hot' },
  { name: 'Jamal Musiala', team: 'Germany', goals: 9, assists: 7, form: 'Hot' },
  { name: 'Niclas Fullkrug', team: 'Germany', goals: 8, assists: 2, form: 'Target' },
]

export const lineups = {
  Spain: [
    ['23', 'U. Simon', 'GK', 0, 5, 3],
    ['2', 'Carvajal', 'RB', 1, 4, 1],
    ['3', 'Le Normand', 'CB', 0, 4, 2],
    ['14', 'Laporte', 'CB', 1, 4, 4],
    ['24', 'Gaya', 'LB', 0, 4, 5],
    ['16', 'Rodri', 'DM', 3, 3, 2],
    ['8', 'Fabian', 'CM', 2, 3, 4],
    ['20', 'Pedri', 'AM', 4, 2, 3],
    ['19', 'Yamal', 'RW', 7, 1, 1],
    ['7', 'Morata', 'ST', 11, 1, 3],
    ['17', 'Williams', 'LW', 6, 1, 5],
  ],
  Germany: [
    ['1', 'Neuer', 'GK', 0, 5, 3],
    ['6', 'Kimmich', 'RB', 2, 4, 1],
    ['2', 'Rudiger', 'CB', 1, 4, 2],
    ['4', 'Tah', 'CB', 0, 4, 4],
    ['18', 'Mittelstadt', 'LB', 1, 4, 5],
    ['8', 'Kroos', 'CM', 2, 3, 2],
    ['21', 'Gundogan', 'CM', 5, 3, 4],
    ['17', 'Wirtz', 'RW', 10, 2, 1],
    ['10', 'Musiala', 'AM', 9, 2, 3],
    ['7', 'Havertz', 'LW', 8, 2, 5],
    ['9', 'Fullkrug', 'ST', 8, 1, 3],
  ],
}

export const groupMatchEvents = [
  { time: "76'", type: 'Goal', detail: 'Lozano finishes from the right channel', score: '2-1', state: 'correct' },
  { time: "55'", type: 'Sub', detail: 'Fresh legs for South Africa', score: '1-1', state: 'neutral' },
  { time: "41'", type: 'Goal', detail: 'Tau equalizes before halftime', score: '1-1', state: 'missed' },
  { time: "18'", type: 'Goal', detail: 'Mexico strike first from a set piece', score: '1-0', state: 'correct' },
]

export const friends = [
  { name: 'Alex', round: 420, awards: 80, exact: 7, total: 1260, status: 'You' },
  { name: 'Maya', round: 390, awards: 120, exact: 8, total: 1245, status: '+18 today' },
  { name: 'Sam', round: 405, awards: 40, exact: 6, total: 1180, status: 'Live jump' },
  { name: 'Jamie', round: 350, awards: 100, exact: 4, total: 1085, status: '2 picks left' },
]

export const liveEvents = [
  { time: "90+4'", type: 'Full time', detail: 'Spain win the quarterfinal', score: '2-1', state: 'correct' },
  { time: "81'", type: 'Goal', detail: 'Musiala curls in from the edge', score: '2-1', state: 'missed' },
  { time: "74'", type: 'Sub', detail: 'Fullkrug on, Havertz off', score: '2-0', state: 'neutral' },
  { time: "66'", type: 'Yellow', detail: 'Rudiger booked', score: '2-0', state: 'neutral' },
  { time: "58'", type: 'Goal', detail: 'Yamal scores, Pedri assist', score: '2-0', state: 'correct' },
  { time: "23'", type: 'Goal', detail: 'Morata header', score: '1-0', state: 'correct' },
]

export const awards = [
  { id: 'potm', label: 'Player of the Tournament', pick: 'Kylian Mbappe', points: 160, state: 'pending' },
  { id: 'boot', label: 'Golden Boot', pick: 'Erling Haaland', points: 120, state: 'pending' },
  { id: 'glove', label: 'Golden Glove', pick: 'Thibaut Courtois', points: 80, state: 'pending' },
  { id: 'young', label: 'Best Young Player', pick: 'Lamine Yamal', points: 80, state: 'tracking' },
]

export const apiNotes = [
  'Recommended adapter: Sportmonks World Cup 2026 API',
  'Prototype uses mock fixtures but keeps provider-shaped resources: fixtures, standings, lineups, events, players, brackets.',
  'Provider decision still needs a trial key check for rate limits, licensing, and lineup/event latency.',
]
