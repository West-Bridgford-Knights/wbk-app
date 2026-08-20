import { useState, useMemo } from "react";
import {
  Users, CalendarDays, ClipboardCheck, Shirt, Trophy, TrendingUp,
  BarChart3, Star, Plus, X, RefreshCw, ChevronRight, Target, Zap,
  LogIn, ShieldCheck, Info
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from "recharts";

// ---------- Design tokens ----------
const COLORS = {
  bg: "#12162A",
  panel: "#191E38",
  panel2: "#212748",
  line: "#39406B",
  chalk: "#E9E6DA",
  chalkDim: "#A6ABC9",
  gold: "#C6A24D",
  clay: "#B5453A",
  sky: "#5A8CA8",
  green: "#5FA463",
};

// ---------- Seed data ----------
const seedPlayers = [
  { id: "p1", name: "Danny Hargreaves", number: 1, pos: "GK" },
  { id: "p2", name: "Mo Iqbal", number: 2, pos: "DEF" },
  { id: "p3", name: "Connor Reilly", number: 4, pos: "DEF" },
  { id: "p4", name: "Sam Okafor", number: 5, pos: "DEF" },
  { id: "p5", name: "Ben Ward", number: 3, pos: "DEF" },
  { id: "p6", name: "Jack Tomlinson", number: 6, pos: "MID" },
  { id: "p7", name: "Ollie Pearce", number: 8, pos: "MID" },
  { id: "p8", name: "Ryan Sullivan", number: 10, pos: "MID" },
  { id: "p9", name: "Kwame Boateng", number: 7, pos: "FWD" },
  { id: "p10", name: "Liam Foster", number: 9, pos: "FWD" },
  { id: "p11", name: "Aaron Blake", number: 11, pos: "FWD" },
  { id: "p12", name: "Josh Newby", number: 12, pos: "MID" },
  { id: "p13", name: "Dean Carrick", number: 14, pos: "DEF" },
];

const seedFixtures = [
  { id: "f1", opponent: "Red Lion Rovers", date: "2026-05-03", venue: "H", oppPos: 2, status: "played" },
  { id: "f2", opponent: "The Cock & Bull FC", date: "2026-05-10", venue: "A", oppPos: 9, status: "played" },
  { id: "f3", opponent: "Kingsway Athletic", date: "2026-05-17", venue: "H", oppPos: 4, status: "played" },
  { id: "f4", opponent: "Miners Welfare", date: "2026-08-16", venue: "A", oppPos: 11, status: "upcoming" },
  { id: "f5", opponent: "Old Grammarians", date: "2026-08-23", venue: "H", oppPos: 1, status: "upcoming" },
];

const seedResults = {
  f1: {
    ourScore: 2, theirScore: 2,
    stats: {
      p1: { min: 90, g: 0, a: 0, r: 3.5 }, p2: { min: 90, g: 0, a: 1, r: 3.5 },
      p3: { min: 90, g: 0, a: 0, r: 3 }, p4: { min: 90, g: 0, a: 0, r: 3.5 },
      p5: { min: 90, g: 0, a: 0, r: 3 }, p6: { min: 90, g: 0, a: 0, r: 4 },
      p7: { min: 90, g: 1, a: 0, r: 4.5 }, p8: { min: 75, g: 0, a: 1, r: 4 },
      p9: { min: 90, g: 1, a: 0, r: 4.5 }, p10: { min: 90, g: 0, a: 1, r: 3.5 },
      p11: { min: 60, g: 0, a: 0, r: 3 },
    },
  },
  f2: {
    ourScore: 4, theirScore: 0,
    stats: {
      p1: { min: 90, g: 0, a: 0, r: 3 }, p2: { min: 90, g: 0, a: 0, r: 3 },
      p3: { min: 90, g: 1, a: 0, r: 4 }, p4: { min: 90, g: 0, a: 0, r: 3 },
      p5: { min: 90, g: 0, a: 1, r: 3.5 }, p6: { min: 90, g: 0, a: 1, r: 3.5 },
      p7: { min: 90, g: 0, a: 2, r: 4 }, p8: { min: 90, g: 1, a: 0, r: 4 },
      p9: { min: 90, g: 2, a: 0, r: 5 }, p10: { min: 90, g: 0, a: 1, r: 3.5 },
      p11: { min: 90, g: 0, a: 0, r: 3 },
    },
  },
  f3: {
    ourScore: 1, theirScore: 3,
    stats: {
      p1: { min: 90, g: 0, a: 0, r: 2.5 }, p2: { min: 90, g: 0, a: 0, r: 2.5 },
      p3: { min: 90, g: 0, a: 0, r: 2 }, p4: { min: 90, g: 0, a: 0, r: 2.5 },
      p5: { min: 90, g: 0, a: 0, r: 2.5 }, p6: { min: 90, g: 0, a: 0, r: 3 },
      p7: { min: 80, g: 1, a: 0, r: 3.5 }, p8: { min: 90, g: 0, a: 0, r: 3 },
      p9: { min: 90, g: 0, a: 1, r: 3 }, p10: { min: 90, g: 0, a: 0, r: 2.5 },
      p11: { min: 45, g: 0, a: 0, r: 2.5 },
    },
  },
};

const seedAvailability = {
  f4: { p1: "yes", p2: "yes", p3: "no", p4: "yes", p5: "yes", p6: "yes", p7: "maybe", p8: "yes", p9: "yes", p10: "no", p11: "yes" },
  f5: { p1: "yes", p2: "yes", p3: "yes", p4: "yes", p5: "maybe" },
};

const seedLeagueTable = [
  { team: "Old Grammarians", p: 18, w: 15, d: 2, l: 1, gf: 48, ga: 14, form: "WWWDW" },
  { team: "Red Lion Rovers", p: 18, w: 13, d: 3, l: 2, gf: 41, ga: 19, form: "WDWWL" },
  { team: "Beechfield United", p: 18, w: 11, d: 4, l: 3, gf: 39, ga: 22, form: "WLWWD" },
  { team: "Kingsway Athletic", p: 18, w: 10, d: 5, l: 3, gf: 35, ga: 24, form: "DWWLW" },
  { team: "West Bridgford Knights", p: 18, w: 9, d: 4, l: 5, gf: 33, ga: 27, form: "WDLWW" },
  { team: "Hillside Wanderers", p: 18, w: 8, d: 5, l: 5, gf: 30, ga: 28, form: "LWDWL" },
  { team: "St. Cuthbert's Old Boys", p: 18, w: 7, d: 4, l: 7, gf: 28, ga: 30, form: "LDWLD" },
  { team: "Foundry Rangers", p: 18, w: 6, d: 5, l: 7, gf: 25, ga: 31, form: "DLLWD" },
  { team: "The Cock & Bull FC", p: 18, w: 5, d: 3, l: 10, gf: 20, ga: 38, form: "LLDLW" },
  { team: "Miners Welfare", p: 18, w: 4, d: 4, l: 10, gf: 19, ga: 40, form: "LLWLD" },
  { team: "Quarrymen AFC", p: 18, w: 3, d: 3, l: 12, gf: 16, ga: 44, form: "LLLDL" },
  { team: "Cross Keys Casuals", p: 18, w: 2, d: 2, l: 14, gf: 12, ga: 50, form: "LLLLD" },
];

const FORMATION = [
  { key: "GK", label: "GK", top: 90, left: 50 },
  { key: "LB", label: "LB", top: 72, left: 15 },
  { key: "CB1", label: "CB", top: 76, left: 37 },
  { key: "CB2", label: "CB", top: 76, left: 63 },
  { key: "RB", label: "RB", top: 72, left: 85 },
  { key: "CM1", label: "CM", top: 50, left: 22 },
  { key: "CM2", label: "CM", top: 46, left: 50 },
  { key: "CM3", label: "CM", top: 50, left: 78 },
  { key: "LW", label: "LW", top: 20, left: 15 },
  { key: "ST", label: "ST", top: 13, left: 50 },
  { key: "RW", label: "RW", top: 20, left: 85 },
];

const TOTAL_TEAMS = seedLeagueTable.length + 1; // + our own varying position, approx

function difficultyFromPos(oppPos, totalTeams = TOTAL_TEAMS) {
  const d = ((totalTeams - oppPos + 1) / totalTeams) * 5;
  return Math.round(d * 10) / 10;
}

function difficultyLabel(d) {
  if (d >= 4) return { text: "Tough", color: COLORS.clay };
  if (d >= 2.6) return { text: "Even", color: COLORS.gold };
  return { text: "Winnable", color: COLORS.green };
}

// ---------- Small UI atoms ----------
function Badge({ children, color = COLORS.gold, subtle }) {
  return (
    <span
      style={{
        background: subtle ? "transparent" : color + "22",
        color,
        border: `1px solid ${color}55`,
        fontFamily: "'JetBrains Mono', monospace",
      }}
      className="text-[11px] px-2 py-0.5 rounded-full font-medium tracking-wide"
    >
      {children}
    </span>
  );
}

const SHIELD_CLIP = "polygon(50% 0%, 100% 22%, 100% 58%, 50% 100%, 0% 58%, 0% 22%)";

function CrestBadge({ size = 34 }) {
  return (
    <div
      style={{
        width: size, height: size * 1.12,
        clipPath: SHIELD_CLIP,
        background: COLORS.gold,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      className="shrink-0"
    >
      <div
        style={{
          width: size - 5, height: (size - 5) * 1.12,
          clipPath: SHIELD_CLIP,
          background: `linear-gradient(160deg, ${COLORS.panel2}, ${COLORS.bg})`,
        }}
        className="flex items-center justify-center"
      >
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold, fontSize: size * 0.5 }}>W</span>
      </div>
    </div>
  );
}

function ShirtBadge({ number, size = 34 }) {
  return (
    <div
      style={{
        width: size, height: size,
        background: `linear-gradient(155deg, ${COLORS.panel2}, ${COLORS.bg})`,
        border: `1px solid ${COLORS.gold}66`,
        color: COLORS.gold,
        fontFamily: "'Bebas Neue', sans-serif",
      }}
      className="rounded-md flex items-center justify-center text-lg shrink-0"
    >
      {number}
    </div>
  );
}

function Stars({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          fill={value >= i ? COLORS.gold : "transparent"}
          color={value >= i - 0.5 ? COLORS.gold : COLORS.line}
        />
      ))}
    </div>
  );
}

function SectionHeading({ eyebrow, title, right }) {
  return (
    <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
      <div>
        <div
          style={{ color: COLORS.gold, fontFamily: "'JetBrains Mono', monospace" }}
          className="text-[11px] tracking-[0.2em] uppercase mb-1"
        >
          {eyebrow}
        </div>
        <h2
          style={{ color: COLORS.chalk, fontFamily: "'Bebas Neue', sans-serif" }}
          className="text-3xl tracking-wide leading-none"
        >
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

function Panel({ children, style, className = "" }) {
  return (
    <div
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, ...style }}
      className={`rounded-xl p-4 ${className}`}
    >
      {children}
    </div>
  );
}

// ---------- Main App ----------
export default function App() {
  const [players, setPlayers] = useState(seedPlayers);
  const [fixtures, setFixtures] = useState(seedFixtures);
  const [results, setResults] = useState(seedResults);
  const [availability, setAvailability] = useState(seedAvailability);
  const [lineups, setLineups] = useState({});
  const [leagueTable, setLeagueTable] = useState(seedLeagueTable);
  const [tab, setTab] = useState("dashboard");
  const [role, setRole] = useState("manager"); // manager | player
  const [activePlayerId, setActivePlayerId] = useState("p9");
  const [scraping, setScraping] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [fixtureForm, setFixtureForm] = useState({ opponent: "", date: "", venue: "H", oppPos: 5 });
  const [resultFixtureId, setResultFixtureId] = useState(null);
  const [lineupFixtureId, setLineupFixtureId] = useState(fixtures.find(f => f.status === "upcoming")?.id || null);

  const upcoming = fixtures.filter(f => f.status === "upcoming").sort((a,b)=>a.date.localeCompare(b.date));
  const played = fixtures.filter(f => f.status === "played").sort((a,b)=>b.date.localeCompare(a.date));

  // ---------- Derived analysis ----------
  const analysis = useMemo(() => {
    const perPlayer = {};
    players.forEach(p => { perPlayer[p.id] = { goals: 0, assists: 0, apps: 0, ratingSum: 0, adjSum: 0, minutes: 0, diffFaced: [] }; });
    Object.entries(results).forEach(([fid, res]) => {
      const fixture = fixtures.find(f => f.id === fid);
      const diff = fixture ? difficultyFromPos(fixture.oppPos) : 2.5;
      Object.entries(res.stats).forEach(([pid, s]) => {
        if (!perPlayer[pid]) return;
        perPlayer[pid].goals += s.g;
        perPlayer[pid].assists += s.a;
        perPlayer[pid].apps += 1;
        perPlayer[pid].minutes += s.min;
        perPlayer[pid].ratingSum += s.r;
        // reward strong ratings against tougher opposition
        const adj = s.r * (1 + (diff - 2.5) / 10);
        perPlayer[pid].adjSum += adj;
        perPlayer[pid].diffFaced.push(diff);
      });
    });
    return players.map(p => {
      const d = perPlayer[p.id];
      const avgRating = d.apps ? d.ratingSum / d.apps : 0;
      const avgAdj = d.apps ? d.adjSum / d.apps : 0;
      const avgDiff = d.diffFaced.length ? d.diffFaced.reduce((a,b)=>a+b,0) / d.diffFaced.length : 0;
      return { ...p, ...d, avgRating, avgAdj, avgDiff };
    });
  }, [players, results, fixtures]);

  const rankedForSelection = [...analysis].filter(a => a.apps > 0).sort((a,b)=>b.avgAdj - a.avgAdj);
  const topScorers = [...analysis].filter(a=>a.goals>0).sort((a,b)=>b.goals-a.goals);
  const topAssists = [...analysis].filter(a=>a.assists>0).sort((a,b)=>b.assists-a.assists);

  const ourTeam = leagueTable.find(t => t.team.startsWith("West Bridgford"));
  const ourPos = leagueTable
    .slice()
    .sort((a,b)=> (b.w*3+b.d) - (a.w*3+a.d) || (b.gf-b.ga)-(a.gf-a.ga))
    .findIndex(t => t.team.startsWith("West Bridgford")) + 1;

  const sortedTable = [...leagueTable].sort((a, b) => {
    const ptsA = a.w*3+a.d, ptsB = b.w*3+b.d;
    if (ptsB !== ptsA) return ptsB - ptsA;
    return (b.gf-b.ga) - (a.gf-a.ga);
  });

  const formSorted = [...leagueTable].map(t => {
    const pts = [...t.form].reduce((s,c)=> s + (c==="W"?3:c==="D"?1:0), 0);
    return { ...t, formPts: pts };
  }).sort((a,b)=>b.formPts-a.formPts);

  function refreshScrape() {
    setScraping(true);
    setTimeout(() => {
      setLeagueTable(prev => prev.map(t => {
        const jitterGf = Math.max(0, t.gf + (Math.random() > 0.5 ? 1 : 0));
        const jitterGa = Math.max(0, t.ga + (Math.random() > 0.6 ? 1 : 0));
        return { ...t, gf: jitterGf, ga: jitterGa };
      }));
      setScraping(false);
    }, 900);
  }

  function addPlayer() {
    if (!newPlayerName.trim()) return;
    const nextNum = Math.max(0, ...players.map(p => p.number)) + 1;
    setPlayers(prev => [...prev, { id: "p" + Date.now(), name: newPlayerName.trim(), number: nextNum, pos: "MID" }]);
    setNewPlayerName("");
  }

  function addFixture() {
    if (!fixtureForm.opponent.trim() || !fixtureForm.date) return;
    setFixtures(prev => [...prev, {
      id: "f" + Date.now(),
      opponent: fixtureForm.opponent.trim(),
      date: fixtureForm.date,
      venue: fixtureForm.venue,
      oppPos: Number(fixtureForm.oppPos),
      status: "upcoming",
    }]);
    setFixtureForm({ opponent: "", date: "", venue: "H", oppPos: 5 });
  }

  function setAvail(fixtureId, playerId, val) {
    setAvailability(prev => ({ ...prev, [fixtureId]: { ...(prev[fixtureId]||{}), [playerId]: val } }));
  }

  function assignSlot(fixtureId, slotKey, playerId) {
    setLineups(prev => {
      const current = prev[fixtureId] || { starters: {}, subs: [] };
      const starters = { ...current.starters };
      // remove player from any other slot first
      Object.keys(starters).forEach(k => { if (starters[k] === playerId) delete starters[k]; });
      if (playerId) starters[slotKey] = playerId; else delete starters[slotKey];
      return { ...prev, [fixtureId]: { ...current, starters } };
    });
  }

  function toggleSub(fixtureId, playerId) {
    setLineups(prev => {
      const current = prev[fixtureId] || { starters: {}, subs: [] };
      const subs = current.subs.includes(playerId)
        ? current.subs.filter(id => id !== playerId)
        : [...current.subs, playerId];
      return { ...prev, [fixtureId]: { ...current, subs } };
    });
  }

  function saveResult(fixtureId, ourScore, theirScore, statsDraft) {
    setResults(prev => ({ ...prev, [fixtureId]: { ourScore, theirScore, stats: statsDraft } }));
    setFixtures(prev => prev.map(f => f.id === fixtureId ? { ...f, status: "played" } : f));
    setResultFixtureId(null);
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: ShieldCheck },
    { key: "squad", label: "Squad", icon: Users },
    { key: "fixtures", label: "Fixtures", icon: CalendarDays },
    { key: "availability", label: "Availability", icon: ClipboardCheck },
    { key: "lineups", label: "Lineups", icon: Shirt },
    { key: "results", label: "Results & Ratings", icon: Target },
    { key: "table", label: "League Table", icon: Trophy },
    { key: "form", label: "Form Table", icon: TrendingUp },
    { key: "analysis", label: "Analysis", icon: BarChart3 },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.chalk }} className="w-full">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 4px; }
        select, input { color-scheme: dark; }
        button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid ${COLORS.gold}; outline-offset: 1px; }
      `}</style>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          style={{ background: COLORS.panel, borderRight: `1px solid ${COLORS.line}` }}
          className="w-[228px] shrink-0 hidden md:flex flex-col py-6 px-3"
        >
          <div className="px-2 mb-8 flex items-center gap-2.5">
            <CrestBadge size={38} />
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-lg tracking-wide leading-[1.05]">
                WEST BRIDGFORD<br/>KNIGHTS
              </div>
              <div style={{ color: COLORS.chalkDim, fontFamily: "'JetBrains Mono', monospace" }} className="text-[10px] tracking-widest mt-1">
                EST. 2019
              </div>
            </div>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  style={{
                    background: active ? COLORS.panel2 : "transparent",
                    color: active ? COLORS.gold : COLORS.chalkDim,
                    borderLeft: active ? `2px solid ${COLORS.gold}` : "2px solid transparent",
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-left transition-colors hover:text-[#E9E4D4]"
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto pt-6 px-1">
            <div style={{ borderTop: `1px solid ${COLORS.line}` }} className="pt-4 text-[11px]" >
              <div style={{ color: COLORS.chalkDim }} className="flex items-center gap-1.5">
                <Info size={12} /> Prototype build
              </div>
              <div style={{ color: COLORS.chalkDim }} className="mt-1 leading-relaxed">
                League table &amp; scrape are simulated for this demo.
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Top bar: role/login simulation */}
          <div
            style={{ borderBottom: `1px solid ${COLORS.line}`, background: COLORS.bg }}
            className="sticky top-0 z-10 px-4 md:px-8 py-3 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="md:hidden flex items-center gap-2">
              <CrestBadge size={26} />
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-lg tracking-wide leading-none">
                WEST BRIDGFORD KNIGHTS
              </div>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <LogIn size={14} color={COLORS.chalkDim} />
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
                className="text-xs rounded-md px-2 py-1.5"
              >
                <option value="manager">Manager account</option>
                <option value="player">Player account</option>
              </select>
              {role === "player" && (
                <select
                  value={activePlayerId}
                  onChange={e => setActivePlayerId(e.target.value)}
                  style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
                  className="text-xs rounded-md px-2 py-1.5"
                >
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
          </div>

          <div className="p-4 md:p-8 max-w-6xl">
            {tab === "dashboard" && (
              <Dashboard
                upcoming={upcoming} played={played} results={results} ourPos={ourPos}
                totalTeams={sortedTable.length} topScorers={topScorers} setTab={setTab}
              />
            )}

            {tab === "squad" && (
              <SquadTab
                players={players} analysis={analysis} newPlayerName={newPlayerName}
                setNewPlayerName={setNewPlayerName} addPlayer={addPlayer} role={role}
              />
            )}

            {tab === "fixtures" && (
              <FixturesTab
                fixtures={fixtures} fixtureForm={fixtureForm} setFixtureForm={setFixtureForm}
                addFixture={addFixture} role={role}
              />
            )}

            {tab === "availability" && (
              <AvailabilityTab
                fixtures={upcoming} players={players} availability={availability}
                setAvail={setAvail} role={role} activePlayerId={activePlayerId}
              />
            )}

            {tab === "lineups" && (
              <LineupsTab
                fixtures={upcoming} players={players} availability={availability}
                lineups={lineups} lineupFixtureId={lineupFixtureId} setLineupFixtureId={setLineupFixtureId}
                assignSlot={assignSlot} toggleSub={toggleSub} role={role}
              />
            )}

            {tab === "results" && (
              <ResultsTab
                fixtures={fixtures} results={results} players={players}
                resultFixtureId={resultFixtureId} setResultFixtureId={setResultFixtureId}
                saveResult={saveResult} role={role}
              />
            )}

            {tab === "table" && (
              <LeagueTableTab sortedTable={sortedTable} refreshScrape={refreshScrape} scraping={scraping} />
            )}

            {tab === "form" && <FormTab formSorted={formSorted} />}

            {tab === "analysis" && (
              <AnalysisTab analysis={analysis} rankedForSelection={rankedForSelection} topScorers={topScorers} topAssists={topAssists} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ upcoming, played, results, ourPos, totalTeams, topScorers, setTab }) {
  const next = upcoming[0];
  const last = played[0];
  const lastResult = last ? results[last.id] : null;
  return (
    <div>
      <SectionHeading eyebrow="Matchday HQ" title="Dashboard" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-2">League Position</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-4xl">
            {ourPos}<span style={{ color: COLORS.chalkDim }} className="text-lg">/{totalTeams}</span>
          </div>
        </Panel>
        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-2">Next Fixture</div>
          {next ? (
            <>
              <div className="text-lg font-semibold">{next.opponent}</div>
              <div style={{ color: COLORS.chalkDim }} className="text-xs mt-1">{next.date} · {next.venue === "H" ? "Home" : "Away"}</div>
            </>
          ) : <div style={{ color: COLORS.chalkDim }} className="text-sm">None scheduled</div>}
        </Panel>
        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-2">Last Result</div>
          {last && lastResult ? (
            <>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="text-2xl">
                {lastResult.ourScore} – {lastResult.theirScore} <span style={{ color: COLORS.chalkDim, fontFamily: "'Inter', sans-serif" }} className="text-sm">vs {last.opponent}</span>
              </div>
            </>
          ) : <div style={{ color: COLORS.chalkDim }} className="text-sm">No results yet</div>}
        </Panel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel>
          <div className="flex items-center justify-between mb-3">
            <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider">Top Scorers</div>
            <button onClick={() => setTab("analysis")} style={{ color: COLORS.gold }} className="text-xs flex items-center gap-0.5">Full analysis <ChevronRight size={12}/></button>
          </div>
          {topScorers.slice(0,4).map(p => (
            <div key={p.id} className="flex items-center justify-between py-1.5" style={{ borderTop: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center gap-2"><ShirtBadge number={p.number} size={26} /><span className="text-sm">{p.name}</span></div>
              <Badge>{p.goals} G</Badge>
            </div>
          ))}
        </Panel>
        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-3">Quick Actions</div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setTab("availability")} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm text-left px-3 py-2 rounded-md flex items-center justify-between hover:opacity-90">Set availability <ChevronRight size={14}/></button>
            <button onClick={() => setTab("lineups")} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm text-left px-3 py-2 rounded-md flex items-center justify-between hover:opacity-90">Pick a lineup <ChevronRight size={14}/></button>
            <button onClick={() => setTab("results")} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm text-left px-3 py-2 rounded-md flex items-center justify-between hover:opacity-90">Log a result <ChevronRight size={14}/></button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------- Squad ----------
function SquadTab({ players, analysis, newPlayerName, setNewPlayerName, addPlayer, role }) {
  return (
    <div>
      <SectionHeading eyebrow={`${players.length} registered`} title="Squad" />
      {role === "manager" && (
        <Panel className="mb-5 flex items-center gap-2 flex-wrap">
          <input
            value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
            placeholder="Add a new player…"
            style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
            className="text-sm px-3 py-2 rounded-md flex-1 min-w-[180px]"
          />
          <button onClick={addPlayer} style={{ background: COLORS.gold, color: COLORS.bg }} className="text-sm font-semibold px-3 py-2 rounded-md flex items-center gap-1">
            <Plus size={14}/> Add player
          </button>
        </Panel>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {analysis.map(p => (
          <Panel key={p.id}>
            <div className="flex items-center gap-3 mb-3">
              <ShirtBadge number={p.number} />
              <div>
                <div className="text-sm font-semibold">{p.name}</div>
                <Badge subtle color={COLORS.sky}>{p.pos}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-xl">{p.apps}</div><div style={{ color: COLORS.chalkDim }} className="text-[10px] uppercase">Apps</div></div>
              <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-xl">{p.goals}</div><div style={{ color: COLORS.chalkDim }} className="text-[10px] uppercase">Goals</div></div>
              <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-xl">{p.assists}</div><div style={{ color: COLORS.chalkDim }} className="text-[10px] uppercase">Assists</div></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span style={{ color: COLORS.chalkDim }} className="text-[11px]">Avg rating</span>
              <Stars value={p.avgRating} />
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

// ---------- Fixtures ----------
function FixturesTab({ fixtures, fixtureForm, setFixtureForm, addFixture, role }) {
  const sorted = [...fixtures].sort((a,b)=>a.date.localeCompare(b.date));
  return (
    <div>
      <SectionHeading eyebrow="Season schedule" title="Fixtures" />
      {role === "manager" && (
        <Panel className="mb-5">
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-3">Add fixture</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <input placeholder="Opponent" value={fixtureForm.opponent}
              onChange={e => setFixtureForm(f => ({ ...f, opponent: e.target.value }))}
              style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
              className="text-sm px-2.5 py-2 rounded-md col-span-2" />
            <input type="date" value={fixtureForm.date}
              onChange={e => setFixtureForm(f => ({ ...f, date: e.target.value }))}
              style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
              className="text-sm px-2.5 py-2 rounded-md" />
            <select value={fixtureForm.venue} onChange={e => setFixtureForm(f => ({ ...f, venue: e.target.value }))}
              style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
              className="text-sm px-2.5 py-2 rounded-md">
              <option value="H">Home</option><option value="A">Away</option>
            </select>
            <input type="number" min="1" max="12" placeholder="Opp. league pos" value={fixtureForm.oppPos}
              onChange={e => setFixtureForm(f => ({ ...f, oppPos: e.target.value }))}
              style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
              className="text-sm px-2.5 py-2 rounded-md" />
          </div>
          <button onClick={addFixture} style={{ background: COLORS.gold, color: COLORS.bg }} className="text-sm font-semibold px-3 py-2 rounded-md mt-3 flex items-center gap-1">
            <Plus size={14}/> Add fixture
          </button>
        </Panel>
      )}
      <div className="flex flex-col gap-2">
        {sorted.map(f => {
          const diff = difficultyFromPos(f.oppPos);
          const dl = difficultyLabel(diff);
          return (
            <Panel key={f.id} className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold">{f.opponent}</div>
                <div style={{ color: COLORS.chalkDim }} className="text-xs mt-0.5">{f.date} · {f.venue === "H" ? "Home" : "Away"} · Opponent pos #{f.oppPos}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={dl.color}>{dl.text} · {diff}/5</Badge>
                <Badge subtle color={f.status === "played" ? COLORS.sky : COLORS.chalkDim}>{f.status}</Badge>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Availability ----------
function AvailabilityTab({ fixtures, players, availability, setAvail, role, activePlayerId }) {
  const relevantPlayers = role === "player" ? players.filter(p => p.id === activePlayerId) : players;
  return (
    <div>
      <SectionHeading eyebrow={role === "player" ? "Set your own status" : "Squad availability"} title="Availability" />
      {fixtures.length === 0 && <Panel><div style={{ color: COLORS.chalkDim }} className="text-sm">No upcoming fixtures.</div></Panel>}
      <div className="flex flex-col gap-5">
        {fixtures.map(f => (
          <Panel key={f.id}>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="text-sm font-semibold">{f.opponent} <span style={{ color: COLORS.chalkDim, fontWeight: 400 }}>· {f.date}</span></div>
              <Badge subtle color={COLORS.sky}>{f.venue === "H" ? "Home" : "Away"}</Badge>
            </div>
            <div className="flex flex-col gap-1.5">
              {relevantPlayers.map(p => {
                const val = availability[f.id]?.[p.id] || "unset";
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                    <div className="flex items-center gap-2"><ShirtBadge number={p.number} size={24} /> {p.name}</div>
                    <div className="flex gap-1">
                      {["yes", "maybe", "no"].map(opt => {
                        const active = val === opt;
                        const c = opt === "yes" ? COLORS.green : opt === "maybe" ? COLORS.gold : COLORS.clay;
                        return (
                          <button key={opt} onClick={() => setAvail(f.id, p.id, opt)}
                            style={{ background: active ? c + "33" : "transparent", border: `1px solid ${active ? c : COLORS.line}`, color: active ? c : COLORS.chalkDim }}
                            className="text-[11px] px-2 py-1 rounded-md capitalize">
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

// ---------- Lineups ----------
function LineupsTab({ fixtures, players, availability, lineups, lineupFixtureId, setLineupFixtureId, assignSlot, toggleSub, role }) {
  const fixture = fixtures.find(f => f.id === lineupFixtureId) || fixtures[0];
  const current = fixture ? (lineups[fixture.id] || { starters: {}, subs: [] }) : { starters: {}, subs: [] };
  const availableIds = fixture ? players.filter(p => (availability[fixture.id]?.[p.id] || "unset") !== "no").map(p=>p.id) : [];
  const usedIds = new Set([...Object.values(current.starters), ...current.subs]);

  if (!fixture) return <div><SectionHeading eyebrow="Team selection" title="Lineups" /><Panel><div style={{ color: COLORS.chalkDim }}>No upcoming fixture to set a lineup for.</div></Panel></div>;

  return (
    <div>
      <SectionHeading
        eyebrow="Team selection"
        title="Lineups"
        right={
          <select value={fixture.id} onChange={e => setLineupFixtureId(e.target.value)}
            style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
            className="text-sm px-3 py-2 rounded-md">
            {fixtures.map(f => <option key={f.id} value={f.id}>{f.opponent} · {f.date}</option>)}
          </select>
        }
      />
      {role !== "manager" && (
        <Panel className="mb-4"><div style={{ color: COLORS.chalkDim }} className="text-sm">Only managers set the lineup. You can view the pitch below.</div></Panel>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              position: "relative", aspectRatio: "3/4",
              background: `repeating-linear-gradient(180deg, #1D4A2A, #1D4A2A 40px, #1A4326 40px, #1A4326 80px)`,
            }}
          >
            <div style={{ position: "absolute", inset: 10, border: "2px solid #ffffff33", borderRadius: 4 }} />
            <div style={{ position: "absolute", top: 10, left: "50%", width: 1, height: "calc(100% - 20px)", background: "#ffffff33" }} />
            <div style={{ position: "absolute", top: "calc(50% - 45px)", left: "50%", transform: "translateX(-50%)", width: 90, height: 90, border: "2px solid #ffffff33", borderRadius: "50%" }} />
            {FORMATION.map(slot => {
              const pid = current.starters[slot.key];
              const player = players.find(p => p.id === pid);
              return (
                <div key={slot.key} style={{ position: "absolute", top: `${slot.top}%`, left: `${slot.left}%`, transform: "translate(-50%,-50%)" }} className="flex flex-col items-center">
                  <select
                    disabled={role !== "manager"}
                    value={pid || ""}
                    onChange={e => assignSlot(fixture.id, slot.key, e.target.value || null)}
                    style={{
                      background: player ? COLORS.gold : "#0F281888",
                      color: player ? COLORS.bg : COLORS.chalk,
                      border: `1px solid ${COLORS.gold}88`,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    className="text-[10px] rounded-full px-1.5 py-1 w-[64px] text-center appearance-none cursor-pointer"
                  >
                    <option value="">{slot.label}</option>
                    {players.filter(p => availableIds.includes(p.id) && (!usedIds.has(p.id) || p.id === pid)).map(p => (
                      <option key={p.id} value={p.id}>{p.number} {p.name.split(" ")[0]}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-3">Available squad</div>
          <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
            {players.filter(p => availableIds.includes(p.id)).map(p => {
              const inSub = current.subs.includes(p.id);
              const inStart = Object.values(current.starters).includes(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <div className="flex items-center gap-2"><ShirtBadge number={p.number} size={24} /> {p.name}</div>
                  {inStart ? <Badge color={COLORS.gold}>Starting</Badge> :
                    <button disabled={role !== "manager"} onClick={() => toggleSub(fixture.id, p.id)}
                      style={{ background: inSub ? COLORS.sky+"33" : "transparent", border: `1px solid ${inSub ? COLORS.sky : COLORS.line}`, color: inSub ? COLORS.sky : COLORS.chalkDim }}
                      className="text-[11px] px-2 py-1 rounded-md">
                      {inSub ? "On bench" : "Add to bench"}
                    </button>}
                </div>
              );
            })}
            {availableIds.length === 0 && <div style={{ color: COLORS.chalkDim }} className="text-sm">No players marked available yet.</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------- Results ----------
function ResultsTab({ fixtures, results, players, resultFixtureId, setResultFixtureId, saveResult, role }) {
  const editing = fixtures.find(f => f.id === resultFixtureId);
  const [draft, setDraft] = useState(null);

  function startEdit(f) {
    const existing = results[f.id];
    setDraft({
      ourScore: existing?.ourScore ?? 0,
      theirScore: existing?.theirScore ?? 0,
      stats: existing?.stats ?? Object.fromEntries(players.map(p => [p.id, { min: 0, g: 0, a: 0, r: 0 }])),
    });
    setResultFixtureId(f.id);
  }

  if (editing && draft) {
    return (
      <div>
        <SectionHeading eyebrow="Log a result" title={editing.opponent} />
        <Panel className="mb-4 flex items-center gap-3">
          <span className="text-sm">Score</span>
          <input type="number" min="0" value={draft.ourScore} onChange={e => setDraft(d => ({...d, ourScore: Number(e.target.value)}))}
            style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }} className="w-16 text-center rounded-md py-1.5" />
          <span style={{ color: COLORS.chalkDim }}>–</span>
          <input type="number" min="0" value={draft.theirScore} onChange={e => setDraft(d => ({...d, theirScore: Number(e.target.value)}))}
            style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }} className="w-16 text-center rounded-md py-1.5" />
          <span style={{ color: COLORS.chalkDim }} className="text-sm">vs {editing.opponent}</span>
        </Panel>
        <Panel style={{ padding: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: COLORS.chalkDim, borderBottom: `1px solid ${COLORS.line}` }} className="text-xs uppercase text-left">
                  <th className="py-2 px-3">Player</th><th className="px-2">Mins</th><th className="px-2">Goals</th><th className="px-2">Assists</th><th className="px-2 w-40">Rating /5</th>
                </tr>
              </thead>
              <tbody>
                {players.map(p => {
                  const s = draft.stats[p.id];
                  const upd = (field, val) => setDraft(d => ({ ...d, stats: { ...d.stats, [p.id]: { ...d.stats[p.id], [field]: val } } }));
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                      <td className="py-2 px-3 flex items-center gap-2"><ShirtBadge number={p.number} size={22}/> {p.name}</td>
                      <td className="px-2"><input type="number" min="0" max="90" value={s.min} onChange={e=>upd("min", Number(e.target.value))} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }} className="w-14 rounded px-1 py-1 text-center" /></td>
                      <td className="px-2"><input type="number" min="0" value={s.g} onChange={e=>upd("g", Number(e.target.value))} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }} className="w-12 rounded px-1 py-1 text-center" /></td>
                      <td className="px-2"><input type="number" min="0" value={s.a} onChange={e=>upd("a", Number(e.target.value))} style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }} className="w-12 rounded px-1 py-1 text-center" /></td>
                      <td className="px-2">
                        <input type="range" min="0" max="5" step="0.5" value={s.r} onChange={e=>upd("r", Number(e.target.value))} className="w-24 align-middle" />
                        <span style={{ color: COLORS.gold }} className="text-xs ml-2">{s.r}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <div className="flex gap-2 mt-4">
          <button onClick={() => saveResult(editing.id, draft.ourScore, draft.theirScore, draft.stats)} style={{ background: COLORS.gold, color: COLORS.bg }} className="text-sm font-semibold px-4 py-2 rounded-md">Save result</button>
          <button onClick={() => setResultFixtureId(null)} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm px-4 py-2 rounded-md flex items-center gap-1"><X size={14}/> Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading eyebrow="Post-match" title="Results & Ratings" />
      <div className="flex flex-col gap-2">
        {[...fixtures].sort((a,b)=>b.date.localeCompare(a.date)).map(f => {
          const r = results[f.id];
          return (
            <Panel key={f.id} className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold">{f.opponent}</div>
                <div style={{ color: COLORS.chalkDim }} className="text-xs mt-0.5">{f.date}</div>
              </div>
              <div className="flex items-center gap-3">
                {r ? <span style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="text-xl">{r.ourScore} – {r.theirScore}</span> : <Badge subtle color={COLORS.chalkDim}>No result yet</Badge>}
                {role === "manager" && (
                  <button onClick={() => startEdit(f)} style={{ background: COLORS.panel2, color: COLORS.gold }} className="text-xs px-3 py-1.5 rounded-md">
                    {r ? "Edit" : "Log result"}
                  </button>
                )}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ---------- League Table ----------
function LeagueTableTab({ sortedTable, refreshScrape, scraping }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Auto-generated from scraped results"
        title="League Table"
        right={
          <button onClick={refreshScrape} disabled={scraping} style={{ background: COLORS.panel2, color: COLORS.gold, border: `1px solid ${COLORS.gold}55` }} className="text-sm px-3 py-2 rounded-md flex items-center gap-2">
            <RefreshCw size={14} className={scraping ? "animate-spin" : ""} /> {scraping ? "Scraping…" : "Refresh from league site"}
          </button>
        }
      />
      <Panel style={{ padding: 0 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: COLORS.chalkDim, borderBottom: `1px solid ${COLORS.line}` }} className="text-xs uppercase text-left">
                <th className="py-2 px-3">#</th><th className="px-2">Team</th><th className="px-2">P</th><th className="px-2">W</th><th className="px-2">D</th><th className="px-2">L</th><th className="px-2">GD</th><th className="px-2">Pts</th>
              </tr>
            </thead>
            <tbody>
              {sortedTable.map((t, i) => {
                const isUs = t.team.startsWith("West Bridgford");
                return (
                  <tr key={t.team} style={{ borderBottom: `1px solid ${COLORS.line}`, background: isUs ? COLORS.panel2 : "transparent" }}>
                    <td className="py-2 px-3" style={{ color: COLORS.chalkDim }}>{i+1}</td>
                    <td className="px-2 font-medium" style={{ color: isUs ? COLORS.gold : COLORS.chalk }}>{t.team}</td>
                    <td className="px-2">{t.p}</td><td className="px-2">{t.w}</td><td className="px-2">{t.d}</td><td className="px-2">{t.l}</td>
                    <td className="px-2">{t.gf - t.ga > 0 ? "+" : ""}{t.gf - t.ga}</td>
                    <td className="px-2 font-semibold">{t.w*3+t.d}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
      <div style={{ color: COLORS.chalkDim }} className="text-xs mt-3 flex items-center gap-1.5"><Info size={12}/> In production this table refreshes from a scheduled scraper hitting the league website, stored in Supabase.</div>
    </div>
  );
}

// ---------- Form Table ----------
function FormTab({ formSorted }) {
  return (
    <div>
      <SectionHeading eyebrow="Last 5 matches" title="Form Table" />
      <div className="flex flex-col gap-2">
        {formSorted.map((t, i) => {
          const isUs = t.team.startsWith("West Bridgford");
          return (
            <Panel key={t.team} className="flex items-center justify-between" style={{ background: isUs ? COLORS.panel2 : COLORS.panel }}>
              <div className="flex items-center gap-3">
                <span style={{ color: COLORS.chalkDim, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs w-5">{i+1}</span>
                <span className="text-sm font-medium" style={{ color: isUs ? COLORS.gold : COLORS.chalk }}>{t.team}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[...t.form].map((c, idx) => (
                    <span key={idx} style={{
                      background: c === "W" ? COLORS.green+"33" : c === "D" ? COLORS.gold+"33" : COLORS.clay+"33",
                      color: c === "W" ? COLORS.green : c === "D" ? COLORS.gold : COLORS.clay,
                      border: `1px solid ${c === "W" ? COLORS.green : c === "D" ? COLORS.gold : COLORS.clay}55`,
                    }} className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold">{c}</span>
                  ))}
                </div>
                <Badge>{t.formPts} pts</Badge>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Analysis ----------
function AnalysisTab({ analysis, rankedForSelection, topScorers, topAssists }) {
  const goalsChart = topScorers.slice(0, 8).map(p => ({ name: p.name.split(" ")[0] + " " + p.name.split(" ")[1][0] + ".", goals: p.goals, assists: p.assists }));
  const scatterData = analysis.filter(a => a.apps > 0).map(a => ({ x: a.avgDiff, y: a.avgRating, name: a.name, z: a.apps }));

  return (
    <div>
      <SectionHeading eyebrow="Team performance" title="Analysis" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-3">Goals &amp; Assists</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={goalsChart}>
                <CartesianGrid stroke={COLORS.line} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: COLORS.chalkDim, fontSize: 11 }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
                <YAxis tick={{ fill: COLORS.chalkDim, fontSize: 11 }} axisLine={{ stroke: COLORS.line }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, borderRadius: 8, color: COLORS.chalk }} />
                <Bar dataKey="goals" fill={COLORS.gold} radius={[3,3,0,0]} />
                <Bar dataKey="assists" fill={COLORS.sky} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-1">Rating vs. Opponent Difficulty</div>
          <div style={{ color: COLORS.chalkDim }} className="text-[11px] mb-2">Players in the top-right raise their game against the toughest opponents.</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid stroke={COLORS.line} />
                <XAxis type="number" dataKey="x" name="Avg difficulty faced" domain={[0,5]} tick={{ fill: COLORS.chalkDim, fontSize: 11 }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
                <YAxis type="number" dataKey="y" name="Avg rating" domain={[0,5]} tick={{ fill: COLORS.chalkDim, fontSize: 11 }} axisLine={{ stroke: COLORS.line }} tickLine={false} />
                <ZAxis type="number" dataKey="z" range={[60, 200]} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, borderRadius: 8, color: COLORS.chalk }}
                  formatter={(val, key) => [Number(val).toFixed(1), key === "x" ? "Difficulty" : "Rating"]} labelFormatter={()=>""} />
                <Scatter data={scatterData} fill={COLORS.gold}>
                  {scatterData.map((_, i) => <Cell key={i} fill={COLORS.gold} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel style={{ padding: 0 }}>
        <div className="p-4 pb-2 flex items-center gap-2">
          <Zap size={15} color={COLORS.gold} />
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider">Selection index — difficulty-adjusted rating</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: COLORS.chalkDim, borderBottom: `1px solid ${COLORS.line}` }} className="text-xs uppercase text-left">
                <th className="py-2 px-3">Player</th><th className="px-2">Apps</th><th className="px-2">Avg rating</th><th className="px-2">Avg difficulty faced</th><th className="px-2">Selection index</th>
              </tr>
            </thead>
            <tbody>
              {rankedForSelection.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                  <td className="py-2 px-3 flex items-center gap-2">
                    <span style={{ color: i < 3 ? COLORS.gold : COLORS.chalkDim, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs w-4">{i+1}</span>
                    <ShirtBadge number={p.number} size={24} /> {p.name}
                  </td>
                  <td className="px-2">{p.apps}</td>
                  <td className="px-2"><Stars value={p.avgRating} /></td>
                  <td className="px-2">{p.avgDiff.toFixed(1)}/5</td>
                  <td className="px-2 font-semibold" style={{ color: COLORS.gold }}>{p.avgAdj.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div style={{ color: COLORS.chalkDim }} className="text-xs mt-3">
        Selection index = average rating, weighted up when the opponent's league position made the fixture tougher. Ranks players on who steps up, not just who scores most.
      </div>
    </div>
  );
}
