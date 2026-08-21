import { useEffect, useMemo, useState } from "react";
import {
  Users, CalendarDays, ClipboardCheck, Shirt, Trophy, TrendingUp,
  BarChart3, Star, Plus, X, RefreshCw, ChevronRight, ChevronLeft, Target, Zap, Download,
  LogIn, ShieldCheck, Info, Wallet, MessageCircle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell
} from "recharts";
import { isSupabaseConfigured } from "./lib/supabase";
import {
  loadAppData,
  loadFixtures,
  loadLeagueTable,
  saveAvailability,
  saveFixture,
  saveLineup,
  savePayment,
  savePlayer,
  saveResult as saveResultToDatabase,
} from "./lib/database";
import clubLogoUrl from "../west-bridgford-knights-logo.svg";

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

const MANAGER_ONLY_TABS = ["lineups", "subs"];

const TOTAL_TEAMS = 12;
const ACTIVE_PLAYER_STORAGE_KEY = "wbk-active-player-id";

function formatFixtureDate(value) {
  if (value === "TBC") return value;
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function difficultyFromPos(oppPos, totalTeams = TOTAL_TEAMS) {
  const d = ((totalTeams - oppPos + 1) / totalTeams) * 5;
  return Math.round(d * 10) / 10;
}

function difficultyLabel(d) {
  if (d >= 4) return { text: "Tough", color: COLORS.clay };
  if (d >= 2.6) return { text: "Even", color: COLORS.gold };
  return { text: "Winnable", color: COLORS.green };
}

// Availability is keyed by date (YYYY-MM-DD), not fixture id, so a rescraped/rescheduled
// fixture never orphans the responses players have already given for that Sunday.
function dateKey(value) {
  if (!value || value === "TBC") return null;
  return String(value).slice(0, 10);
}

function toInputDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit" });
}

// Resolved against the current page rather than a hardcoded host, so this keeps working
// whichever domain/org GitHub Pages serves the app from (same approach as the calendar link).
function getSiteUrl() {
  return window.location.href.split(/[?#]/)[0];
}

function monthKey(offsetFromToday) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Locked from the Friday before a Sunday fixture onward — self-service edits close to
// a game go through the manager instead, so a panicked last-minute drop-out isn't silent.
function isAvailabilityLocked(date) {
  const cutoff = new Date(`${date}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - 2);
  return new Date() >= cutoff;
}

function monthLabel(period) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function getSundaysBetween(fromStr, toStr) {
  if (!fromStr || !toStr) return [];
  const start = new Date(`${fromStr}T00:00:00`);
  const end = new Date(`${toStr}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + ((7 - cursor.getDay()) % 7));
  const dates = [];
  while (cursor <= end) {
    dates.push(toInputDate(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
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

function WhatsAppChaseButton({ buildMessage, disabled, label = "Send WhatsApp" }) {
  const [copied, setCopied] = useState(false);
  function handleClick() {
    navigator.clipboard?.writeText(buildMessage()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {});
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      style={{ background: COLORS.sky, color: COLORS.bg, opacity: disabled ? 0.5 : 1 }}
      className="text-[11px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 whitespace-nowrap"
    >
      <MessageCircle size={12} /> {copied ? "Copied!" : label}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#0A0D1CAA", zIndex: 50 }}
      className="flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, maxWidth: 420, width: "100%", maxHeight: "80vh" }}
        className="rounded-xl p-5 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-3">
          <div style={{ color: COLORS.chalk }} className="text-sm font-semibold">{title}</div>
          <button type="button" onClick={onClose} style={{ color: COLORS.chalkDim }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
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
        {eyebrow && (
          <div
            style={{ color: COLORS.gold, fontFamily: "'JetBrains Mono', monospace" }}
            className="text-[11px] tracking-[0.2em] uppercase mb-1"
          >
            {eyebrow}
          </div>
        )}
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

async function downloadSquadPng(fixture, players, captainId, previewWindow) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1100;
  const context = canvas.getContext("2d");
  const navy = "#151A3A";
  const gold = COLORS.gold;
  const chalk = "#F5F3EE";
  const muted = "#C6C9D8";
  const sortedPlayers = [...players].sort((a, b) => a.number - b.number);
  const captain = sortedPlayers.find(player => player.id === captainId);

  context.fillStyle = navy;
  context.fillRect(0, 0, 800, 1100);

  const sky = context.createLinearGradient(0, 0, 800, 1100);
  sky.addColorStop(0, "#29324B");
  sky.addColorStop(0.45, "#19213E");
  sky.addColorStop(1, "#0C1230");
  context.fillStyle = sky;
  context.fillRect(0, 0, 800, 1100);

  // Abstract stadium lights and fabric folds create the supplied poster's atmosphere.
  context.save();
  context.globalAlpha = 0.13;
  context.strokeStyle = "#E6E8F2";
  context.lineWidth = 3;
  for (let x = -100; x < 900; x += 110) {
    context.beginPath();
    context.moveTo(x, 80);
    context.quadraticCurveTo(x + 25, 520, x - 60, 1100);
    context.stroke();
  }
  context.globalAlpha = 0.14;
  context.strokeStyle = gold;
  context.lineWidth = 2;
  for (let y = 580; y < 1060; y += 52) {
    context.beginPath();
    context.moveTo(0, y);
    context.quadraticCurveTo(400, y - 70, 800, y);
    context.stroke();
  }
  context.restore();

  context.fillStyle = gold;
  context.fillRect(0, 0, 34, 1100);
  context.fillRect(766, 0, 34, 1100);
  for (let y = 18; y < 1100; y += 150) {
    context.fillStyle = navy;
    context.fillRect(0, y, 34, 52);
    context.fillRect(766, y + 62, 34, 52);
  }

  context.textAlign = "center";
  context.fillStyle = gold;
  context.font = "bold 29px Arial, sans-serif";
  context.fillText("WEST BRIDGFORD KNIGHTS F.C.", 400, 48);
  context.fillStyle = chalk;
  context.font = "bold 28px Arial, sans-serif";
  context.fillText("VS", 400, 88);
  context.fillStyle = chalk;
  context.font = "bold 29px Arial, sans-serif";
  context.fillText(fixture.opponent.toUpperCase(), 400, 128);
  context.fillStyle = muted;
  context.font = "bold 21px Arial, sans-serif";
  context.fillText(`${formatFixtureDate(fixture.date)}  |  ${fixture.venue}`, 400, 164);
  const competition = fixture.competition === "One" ? "" : fixture.competition;
  if (competition) {
    context.font = "bold 18px Arial, sans-serif";
    context.fillText(competition, 400, 192);
  }

  context.fillStyle = chalk;
  context.font = "bold 112px Impact, sans-serif";
  context.fillText("SQUAD", 400, competition ? 290 : 270);

  context.textAlign = "left";
  const columns = [sortedPlayers.slice(0, Math.ceil(sortedPlayers.length / 2)), sortedPlayers.slice(Math.ceil(sortedPlayers.length / 2))];
  const listTop = competition ? 340 : 320;
  const rowHeight = Math.min(38, 500 / Math.max(columns[0].length, 1));
  columns.forEach((column, columnIndex) => {
    const x = columnIndex === 0 ? 70 : 420;
    column.forEach((player, index) => {
      const y = listTop + index * rowHeight;
      context.fillStyle = gold;
      context.font = "bold 22px Arial, sans-serif";
      context.fillText(`${player.number}.`, x, y);
      context.fillStyle = chalk;
      context.font = "bold 22px Arial, sans-serif";
      context.fillText(player.name.toUpperCase(), x + 52, y);
      if (player.id === captainId) {
        context.fillStyle = gold;
        context.font = "bold 14px Arial, sans-serif";
        context.fillText("C", x + 52 + context.measureText(player.name.toUpperCase()).width + 8, y);
      }
    });
  });

  context.fillStyle = gold;
  context.fillRect(72, 850, 656, 2);
  context.fillStyle = gold;
  context.font = "bold 18px Arial, sans-serif";
  context.fillText("MANAGER", 72, 937);
  context.fillStyle = chalk;
  context.font = "bold 27px Arial, sans-serif";
  context.fillText("LUKE MAXTED", 72, 971);
  context.fillStyle = muted;
  context.font = "15px Arial, sans-serif";
  context.fillText(captain ? `CAPTAIN  ${captain.name.toUpperCase()}` : "CAPTAIN  NOT SELECTED", 72, 999);

  const logo = new Image();
  logo.src = clubLogoUrl;
  await new Promise(resolve => {
    logo.onload = resolve;
    logo.onerror = resolve;
  });
  if (logo.complete && logo.naturalWidth) context.drawImage(logo, 390, 877, 338, 169);

  context.fillStyle = gold;
  context.fillRect(72, 1072, 656, 2);

  const dataUrl = canvas.toDataURL("image/png");
  // Mobile browsers (Safari in particular) don't reliably honour the download attribute,
  // so a straight download can land somewhere the user can't find. Writing the image into
  // a pre-opened tab lets them long-press/save it instead — navigating that tab's location
  // instead of writing to it fails silently on iOS Safari once the async work above has
  // used up the user-gesture window, leaving the tab stuck on about:blank.
  if (previewWindow && !previewWindow.closed) {
    previewWindow.document.open();
    previewWindow.document.write(`<!doctype html><html><head><title>Squad vs ${fixture.opponent}</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#12162A;min-height:100vh;display:flex;align-items:center;justify-content:center;"><img src="${dataUrl}" alt="Squad graphic" style="max-width:100%;height:auto;display:block;"></body></html>`);
    previewWindow.document.close();
  } else {
    const link = document.createElement("a");
    link.download = `match-day-squad-${fixture.id}.png`;
    link.href = dataUrl;
    link.click();
  }
}

// ---------- Main App ----------
export default function App() {
  const [players, setPlayers] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState({});
  const [availability, setAvailability] = useState({});
  const [lineups, setLineups] = useState({});
  const [payments, setPayments] = useState({});
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [role, setRole] = useState("player"); // manager | player
  const [activePlayerId, setActivePlayerId] = useState(
    () => localStorage.getItem(ACTIVE_PLAYER_STORAGE_KEY) || null
  );
  const [managerUnlockClicks, setManagerUnlockClicks] = useState(0);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [fixtureForm, setFixtureForm] = useState({ opponent: "", date: "", venue: "H", competition: "One" });
  const [resultFixtureId, setResultFixtureId] = useState(null);
  const [lineupFixtureId, setLineupFixtureId] = useState(fixtures.find(f => f.status === "upcoming")?.id || null);
  const [leagueTable, setLeagueTable] = useState([]);
  const [leagueTableLoading, setLeagueTableLoading] = useState(false);
  const [fixturesLoading, setFixturesLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    loadAppData()
      .then(data => {
        setPlayers(data.players);
        setFixtures(data.fixtures);
        setAvailability(data.availability);
        setLineups(data.lineups);
        setPayments(data.payments);
        setResults(data.results);
        setLeagueTable(data.leagueTable);
        setLineupFixtureId(data.fixtures.find(f => f.status === "upcoming")?.id || null);
        setDataReady(true);
      })
      .catch(error => setDataError(error.message || "Unable to load data from Supabase."));
  }, []);

  function reportSaveError(error) {
    setDataError(error.message || "Unable to save changes to Supabase.");
  }

  function refreshLeagueTable() {
    setLeagueTableLoading(true);
    loadLeagueTable()
      .then(setLeagueTable)
      .catch(reportSaveError)
      .finally(() => setLeagueTableLoading(false));
  }

  function refreshFixtures() {
    setFixturesLoading(true);
    loadFixtures()
      .then(setFixtures)
      .catch(reportSaveError)
      .finally(() => setFixturesLoading(false));
  }

  function selectActivePlayer(playerId) {
    setActivePlayerId(playerId);
    if (playerId) localStorage.setItem(ACTIVE_PLAYER_STORAGE_KEY, playerId);
    else localStorage.removeItem(ACTIVE_PLAYER_STORAGE_KEY);
  }

  function handlePlayerAccountClick() {
    const nextClickCount = managerUnlockClicks + 1;
    if (nextClickCount >= 5) {
      setRole("manager");
      setManagerUnlockClicks(0);
      return;
    }
    setManagerUnlockClicks(nextClickCount);
  }

  // Players marked not-playing are kept in the squad roster but dropped from anywhere
  // availability or subs are tracked/chased, so nobody's chasing someone who's left.
  const activePlayers = players.filter(p => p.active !== false);

  const upcoming = fixtures.filter(f => f.status === "upcoming").sort((a,b)=>a.date.localeCompare(b.date));
  const played = fixtures.filter(f => f.status === "played").sort((a,b)=>b.date.localeCompare(a.date));

  // ---------- Derived analysis ----------
  const analysis = useMemo(() => {
    const perPlayer = {};
    players.forEach(p => { perPlayer[p.id] = { goals: 0, assists: 0, apps: 0, ratingSum: 0, adjSum: 0, minutes: 0, diffFaced: [], cleanSheets: 0, impactSum: 0 }; });
    Object.entries(results).forEach(([fid, res]) => {
      const fixture = fixtures.find(f => f.id === fid);
      const diff = fixture ? difficultyFromPos(fixture.oppPos) : 2.5;
      Object.entries(res.stats).forEach(([pid, s]) => {
        const d = perPlayer[pid];
        if (!d) return;
        const pos = players.find(p => p.id === pid)?.pos;
        d.goals += s.g;
        d.assists += s.a;
        d.apps += 1;
        d.minutes += s.min;
        d.ratingSum += s.r;
        // reward strong ratings against tougher opposition
        const difficultyMultiplier = 1 + (diff - 2.5) / 10;
        const adj = s.r * difficultyMultiplier;
        d.adjSum += adj;
        d.diffFaced.push(diff);

        // Impact score layers minutes played, clean sheets for GK/DEF, and goal
        // contributions for MID/FWD on top of rating — then, like the rating
        // itself, the whole thing is weighted up for tougher opposition.
        const minutesPoints = (Math.min(s.min, 90) / 90) * 0.5;
        const isCleanSheet = (pos === "GK" || pos === "DEF") && s.min >= 60 && res.theirScore === 0;
        if (isCleanSheet) d.cleanSheets += 1;
        const goalContribPoints = (pos === "MID" || pos === "FWD") ? s.g * 0.5 + s.a * 0.3 : 0;
        const rawImpact = s.r + minutesPoints + (isCleanSheet ? 1 : 0) + goalContribPoints;
        d.impactSum += rawImpact * difficultyMultiplier;
      });
    });
    return players.map(p => {
      const d = perPlayer[p.id];
      const avgRating = d.apps ? d.ratingSum / d.apps : 0;
      const avgAdj = d.apps ? d.adjSum / d.apps : 0;
      const avgDiff = d.diffFaced.length ? d.diffFaced.reduce((a,b)=>a+b,0) / d.diffFaced.length : 0;
      const avgMinutes = d.apps ? d.minutes / d.apps : 0;
      const avgImpact = d.apps ? d.impactSum / d.apps : 0;
      return { ...p, ...d, avgRating, avgAdj, avgDiff, avgMinutes, avgImpact };
    });
  }, [players, results, fixtures]);

  const rankedForSelection = [...analysis].filter(a => a.apps > 0).sort((a,b)=>b.avgAdj - a.avgAdj);
  const rankedForImpact = [...analysis].filter(a => a.apps > 0).sort((a,b)=>b.avgImpact - a.avgImpact);
  const topScorers = [...analysis].filter(a=>a.goals>0).sort((a,b)=>b.goals-a.goals);
  const topAssists = [...analysis].filter(a=>a.assists>0).sort((a,b)=>b.assists-a.assists);

  if (!isSupabaseConfigured || dataError || !dataReady) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.chalk }} className="p-6 md:p-12">
        <div style={{ maxWidth: 620, background: COLORS.panel, border: `1px solid ${COLORS.line}` }} className="rounded-xl p-6">
          <SectionHeading eyebrow="Supabase connection" title={dataError ? "Connection error" : isSupabaseConfigured ? "Loading team data" : "Setup required"} />
          <p style={{ color: COLORS.chalkDim }} className="text-sm leading-relaxed">
            {dataError || (isSupabaseConfigured
              ? "Loading players, fixtures and availability from Supabase..."
              : "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to a local .env file, then run the SQL in supabase/schema.sql in your Supabase SQL Editor.")}
          </p>
        </div>
      </div>
    );
  }

  const activePlayerValid = players.some(p => p.id === activePlayerId);

  if (role === "player" && !activePlayerValid) {
    return (
      <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.chalk }} className="p-6 md:p-12 flex items-center justify-center">
        <div style={{ maxWidth: 480, width: "100%", background: COLORS.panel, border: `1px solid ${COLORS.line}` }} className="rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <CrestBadge size={34} />
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-lg tracking-wide leading-none">
              WEST BRIDGFORD KNIGHTS
            </div>
          </div>
          <SectionHeading eyebrow="Welcome" title="Who's this?" />
          <p style={{ color: COLORS.chalkDim }} className="text-sm leading-relaxed mb-4">
            Pick your name to see your fixtures, availability and stats. We'll remember your choice on this device.
          </p>
          <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1">
            {players.map(p => (
              <button
                key={p.id}
                onClick={() => selectActivePlayer(p.id)}
                style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
                className="text-sm text-left px-3 py-2.5 rounded-md flex items-center gap-2.5 hover:opacity-90"
              >
                <ShirtBadge number={p.number} size={26} /> {p.name}
              </button>
            ))}
            {players.length === 0 && (
              <div style={{ color: COLORS.chalkDim }} className="text-sm">No players registered yet.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function addPlayer() {
    if (!newPlayerName.trim()) return;
    const nextNum = Math.max(0, ...players.map(p => p.number)) + 1;
    const player = { id: "p" + Date.now(), name: newPlayerName.trim(), number: nextNum, pos: "MID", active: true };
    setPlayers(prev => [...prev, player]);
    void savePlayer(player).catch(reportSaveError);
    setNewPlayerName("");
  }

  function updatePlayer(id, updates) {
    const player = players.find(p => p.id === id);
    if (!player) return;
    const updated = { ...player, ...updates };
    setPlayers(prev => prev.map(p => p.id === id ? updated : p));
    void savePlayer(updated).catch(reportSaveError);
  }

  function addFixture() {
    if (!fixtureForm.opponent.trim() || !fixtureForm.date) return;
    const isHome = fixtureForm.venue === "H";
    const fixture = {
      id: "f" + Date.now(),
      type: "L",
      homeTeam: isHome ? "West Bridgford Knights F.C." : fixtureForm.opponent.trim(),
      awayTeam: isHome ? fixtureForm.opponent.trim() : "West Bridgford Knights F.C.",
      opponent: fixtureForm.opponent.trim(),
      date: fixtureForm.date,
      venue: isHome ? "Home" : "Away",
      competition: fixtureForm.competition.trim() || "One",
      status: "upcoming",
      oppPos: 6,
    };
    setFixtures(prev => [...prev, fixture]);
    void saveFixture(fixture).catch(reportSaveError);
    setFixtureForm({ opponent: "", date: "", venue: "H", competition: "One" });
  }

  function setAvail(date, playerId, val) {
    const next = { ...availability, [date]: { ...(availability[date] || {}), [playerId]: val } };
    setAvailability(next);
    void saveAvailability(date, playerId, val).catch(reportSaveError);
  }

  function setPaymentStatus(period, playerId, status) {
    const next = { ...payments, [period]: { ...(payments[period] || {}), [playerId]: status } };
    setPayments(next);
    void savePayment(period, playerId, status).catch(reportSaveError);
  }

  function assignSlot(fixtureId, slotKey, playerId) {
    const current = lineups[fixtureId] || { starters: {}, subs: [] };
    const starters = { ...current.starters };
    Object.keys(starters).forEach(k => { if (starters[k] === playerId) delete starters[k]; });
    if (playerId) starters[slotKey] = playerId; else delete starters[slotKey];
    const lineup = { ...current, starters };
    setLineups(prev => ({ ...prev, [fixtureId]: lineup }));
    void saveLineup(fixtureId, lineup).catch(reportSaveError);
  }

  function toggleSub(fixtureId, playerId) {
    const current = lineups[fixtureId] || { starters: {}, subs: [] };
    const subs = current.subs.includes(playerId)
      ? current.subs.filter(id => id !== playerId)
      : [...current.subs, playerId];
    const lineup = { ...current, subs };
    setLineups(prev => ({ ...prev, [fixtureId]: lineup }));
    void saveLineup(fixtureId, lineup).catch(reportSaveError);
  }

  function selectCaptain(fixtureId, playerId) {
    const current = lineups[fixtureId] || { starters: {}, subs: [], captain: null };
    const lineup = { ...current, captain: current.captain === playerId ? null : playerId };
    setLineups(prev => ({ ...prev, [fixtureId]: lineup }));
    void saveLineup(fixtureId, lineup).catch(reportSaveError);
  }

  function saveResult(fixtureId, ourScore, theirScore, statsDraft) {
    const result = { ourScore, theirScore, stats: statsDraft };
    setResults(prev => ({ ...prev, [fixtureId]: result }));
    setFixtures(prev => prev.map(f => f.id === fixtureId ? { ...f, status: "played" } : f));
    void saveResultToDatabase(fixtureId, result).catch(reportSaveError);
    setResultFixtureId(null);
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: ShieldCheck },
    { key: "squad", label: "Squad", icon: Users },
    { key: "fixtures", label: "Fixtures", icon: CalendarDays },
    { key: "availability", label: "Availability", icon: ClipboardCheck },
    { key: "lineups", label: "Matchday Squads", icon: Shirt },
    { key: "subs", label: "Subs", icon: Wallet },
    { key: "results", label: "Results & Ratings", icon: Target },
    { key: "league", label: "League Table", icon: Trophy },
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
            {navItems.filter(item => !MANAGER_ONLY_TABS.includes(item.key) || role === "manager").map(item => {
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
              <button
                type="button"
                onClick={handlePlayerAccountClick}
                aria-label="Player account"
                title="Player account"
                style={{ color: COLORS.chalkDim }}
                className="text-xs flex items-center gap-1.5"
              >
                <LogIn size={14} /> Player account
              </button>
              {role === "player" && (
                <>
                  <select
                    value={activePlayerId || ""}
                    onChange={e => selectActivePlayer(e.target.value)}
                    style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
                    className="text-xs rounded-md px-2 py-1.5"
                  >
                    {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => selectActivePlayer(null)}
                    style={{ color: COLORS.chalkDim }}
                    className="text-xs"
                  >
                    Switch player
                  </button>
                </>
              )}
            </div>
          </div>

          <nav
            aria-label="Mobile navigation"
            style={{ background: COLORS.panel, borderBottom: `1px solid ${COLORS.line}` }}
            className="md:hidden flex gap-1 overflow-x-auto px-3 py-2"
          >
            {navItems.filter(item => !MANAGER_ONLY_TABS.includes(item.key) || role === "manager").map(item => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  style={{
                    background: active ? COLORS.panel2 : "transparent",
                    color: active ? COLORS.gold : COLORS.chalkDim,
                    border: `1px solid ${active ? COLORS.gold : "transparent"}`,
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap"
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 md:p-8 max-w-6xl">
            {tab === "dashboard" && (
              <Dashboard
                upcoming={upcoming} played={played} results={results}
                topScorers={topScorers} setTab={setTab} role={role}
              />
            )}

            {tab === "squad" && (
              <SquadTab
                players={players} analysis={analysis}
                newPlayerName={newPlayerName} setNewPlayerName={setNewPlayerName} addPlayer={addPlayer}
                updatePlayer={updatePlayer} role={role}
              />
            )}

            {tab === "fixtures" && (
              <FixturesTab
                fixtures={fixtures} players={activePlayers} availability={availability}
                fixtureForm={fixtureForm} setFixtureForm={setFixtureForm}
                addFixture={addFixture} role={role}
                refreshFixtures={refreshFixtures} fixturesLoading={fixturesLoading}
              />
            )}

            {tab === "availability" && (
              <AvailabilityTab
                fixtures={fixtures} players={activePlayers} availability={availability}
                setAvail={setAvail} role={role} activePlayerId={activePlayerId}
              />
            )}

            {tab === "lineups" && (
              <LineupsTab
                fixtures={upcoming} players={activePlayers} availability={availability}
                lineups={lineups} lineupFixtureId={lineupFixtureId} setLineupFixtureId={setLineupFixtureId}
                assignSlot={assignSlot} toggleSub={toggleSub} selectCaptain={selectCaptain} role={role}
              />
            )}

            {tab === "subs" && (
              <SubsTab players={activePlayers} payments={payments} setPaymentStatus={setPaymentStatus} role={role} />
            )}

            {tab === "results" && (
              <ResultsTab
                fixtures={fixtures} results={results} players={players}
                resultFixtureId={resultFixtureId} setResultFixtureId={setResultFixtureId}
                saveResult={saveResult} role={role}
              />
            )}

            {tab === "league" && (
              <LeagueTableTab sortedTable={leagueTable} refreshScrape={refreshLeagueTable} scraping={leagueTableLoading} />
            )}

            {tab === "analysis" && (
              <AnalysisTab analysis={analysis} rankedForSelection={rankedForSelection} rankedForImpact={rankedForImpact} topScorers={topScorers} topAssists={topAssists} role={role} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ upcoming, played, results, topScorers, setTab, role }) {
  const next = upcoming[0];
  const last = played[0];
  const lastResult = last ? results[last.id] : null;
  return (
    <div>
      <SectionHeading eyebrow="Matchday HQ" title="Dashboard" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-2">Scheduled fixtures</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-4xl">{upcoming.length}</div>
        </Panel>
        <Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-2">Next Fixture</div>
          {next ? (
            <>
              <div className="text-lg font-semibold">{next.opponent}</div>
              <div style={{ color: COLORS.chalkDim }} className="text-xs mt-1">{formatFixtureDate(next.date)} · {next.venue}</div>
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
            {role === "manager" && <button onClick={() => setTab("lineups")} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm text-left px-3 py-2 rounded-md flex items-center justify-between hover:opacity-90">Matchday squads <ChevronRight size={14}/></button>}
            {role === "manager" && <button onClick={() => setTab("results")} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm text-left px-3 py-2 rounded-md flex items-center justify-between hover:opacity-90">Log a result <ChevronRight size={14}/></button>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------- Squad ----------
function SquadTab({ players, analysis, newPlayerName, setNewPlayerName, addPlayer, updatePlayer, role }) {
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
          <PlayerCard key={p.id} p={p} role={role} updatePlayer={updatePlayer} />
        ))}
      </div>
    </div>
  );
}

function PlayerCard({ p, role, updatePlayer }) {
  const [name, setName] = useState(p.name);
  const [number, setNumber] = useState(String(p.number));
  const editable = role === "manager";
  const isActive = p.active !== false;

  useEffect(() => setName(p.name), [p.name]);
  useEffect(() => setNumber(String(p.number)), [p.number]);

  function commitName() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== p.name) updatePlayer(p.id, { name: trimmed });
    else setName(p.name);
  }

  function commitNumber() {
    const parsed = Number(number);
    if (parsed > 0 && parsed !== p.number) updatePlayer(p.id, { number: parsed });
    else setNumber(String(p.number));
  }

  return (
    <Panel style={{ opacity: isActive ? 1 : 0.6 }}>
      {!isActive && <div className="mb-2"><Badge subtle color={COLORS.chalkDim}>Not playing currently</Badge></div>}
      <div className="flex items-center gap-3 mb-3">
        {editable ? (
          <input
            type="number"
            value={number}
            onChange={e => setNumber(e.target.value)}
            onBlur={commitNumber}
            style={{
              width: 40, height: 40,
              background: `linear-gradient(155deg, ${COLORS.panel2}, ${COLORS.bg})`,
              border: `1px solid ${COLORS.gold}66`, color: COLORS.gold,
              fontFamily: "'Bebas Neue', sans-serif",
            }}
            className="rounded-md text-center text-lg shrink-0"
          />
        ) : (
          <ShirtBadge number={p.number} />
        )}
        <div className="flex-1 min-w-0">
          {editable ? (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={commitName}
              style={{ background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
              className="text-sm font-semibold px-2 py-1 rounded-md w-full mb-1"
            />
          ) : (
            <div className="text-sm font-semibold">{p.name}</div>
          )}
          {editable ? (
            <select
              value={p.pos}
              onChange={e => updatePlayer(p.id, { pos: e.target.value })}
              style={{ background: COLORS.panel2, border: `1px solid ${COLORS.sky}66`, color: COLORS.sky }}
              className="text-[11px] px-2 py-0.5 rounded-full font-medium tracking-wide"
            >
              <option value="GK">GK</option>
              <option value="DEF">DEF</option>
              <option value="MID">MID</option>
              <option value="FWD">FWD</option>
            </select>
          ) : (
            <Badge subtle color={COLORS.sky}>{p.pos}</Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-xl">{p.apps}</div><div style={{ color: COLORS.chalkDim }} className="text-[10px] uppercase">Apps</div></div>
        <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-xl">{p.goals}</div><div style={{ color: COLORS.chalkDim }} className="text-[10px] uppercase">Goals</div></div>
        <div><div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-xl">{p.assists}</div><div style={{ color: COLORS.chalkDim }} className="text-[10px] uppercase">Assists</div></div>
      </div>
      {role === "manager" && (
        <div className="mt-3 flex items-center justify-between">
          <span style={{ color: COLORS.chalkDim }} className="text-[11px]">Avg rating</span>
          <Stars value={p.avgRating} />
        </div>
      )}
      {role === "manager" && (
        <button
          type="button"
          onClick={() => updatePlayer(p.id, { active: !isActive })}
          style={{ color: isActive ? COLORS.clay : COLORS.green, border: `1px solid ${isActive ? COLORS.clay : COLORS.green}55` }}
          className="mt-3 w-full text-[11px] font-medium px-2 py-1.5 rounded-md"
        >
          {isActive ? "Mark as not playing currently" : "Mark as playing again"}
        </button>
      )}
    </Panel>
  );
}

// ---------- Fixtures ----------
const AVAILABILITY_STATUS_GROUPS = [
  { key: "yes", label: "In", color: COLORS.green },
  { key: "no", label: "Out", color: COLORS.clay },
  { key: "maybe", label: "Maybe", color: COLORS.gold },
  { key: "unset", label: "Yet to decide", color: COLORS.chalkDim },
];

function FixturesTab({ fixtures, players, availability, fixtureForm, setFixtureForm, addFixture, role, refreshFixtures, fixturesLoading }) {
  const [calendarCopied, setCalendarCopied] = useState(false);
  const [modal, setModal] = useState(null);
  const sorted = [...fixtures].sort((a,b)=>a.date === "TBC" ? 1 : b.date === "TBC" ? -1 : a.date.localeCompare(b.date));
  const lastScraped = fixtures.reduce((latest, f) => (f.scrapedAt && (!latest || f.scrapedAt > latest) ? f.scrapedAt : latest), null);

  function subscribeToCalendar() {
    // Resolved against the current page rather than a hardcoded host, so this keeps working
    // whichever domain/org GitHub Pages serves the app from.
    const icsUrl = new URL("fixtures.ics", window.location.href).toString();
    navigator.clipboard?.writeText(icsUrl).then(() => {
      setCalendarCopied(true);
      setTimeout(() => setCalendarCopied(false), 3000);
    }).catch(() => {});
    // webcal:// hands the URL straight to the OS's default calendar app (Apple Calendar,
    // Outlook) as a live subscription; browsers/apps with no handler just no-op, leaving
    // the clipboard copy above as the fallback for Google Calendar's "From URL" import.
    window.location.href = icsUrl.replace(/^https?:/, "webcal:");
  }

  return (
    <div>
      <SectionHeading
        title="Fixtures"
        right={
          <div className="flex items-center gap-2">
            <button onClick={subscribeToCalendar} style={{ background: COLORS.gold, color: COLORS.bg }} className="text-sm font-semibold px-3 py-2 rounded-md flex items-center gap-1.5">
              <Download size={14}/> {calendarCopied ? "Link copied!" : "Subscribe to calendar"}
            </button>
            <button onClick={refreshFixtures} disabled={fixturesLoading} style={{ background: COLORS.panel2, color: COLORS.gold, border: `1px solid ${COLORS.gold}55` }} className="text-sm px-3 py-2 rounded-md flex items-center gap-2">
              <RefreshCw size={14} className={fixturesLoading ? "animate-spin" : ""} /> {fixturesLoading ? "Refreshing…" : "Reload latest"}
            </button>
          </div>
        }
      />
      {lastScraped && (
        <div style={{ color: COLORS.chalkDim }} className="text-xs mb-1.5 flex items-center gap-1.5">
          <Info size={12}/> Last updated {new Date(lastScraped).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}.
        </div>
      )}
      <div style={{ color: COLORS.chalkDim }} className="text-xs mb-4 flex items-center gap-1.5">
        <Info size={12}/> Subscribing keeps your calendar in sync automatically. Opens directly in Apple/Outlook calendars; for Google Calendar use Settings → Add calendar → From URL and paste the copied link.
      </div>
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
            <input placeholder="Competition" value={fixtureForm.competition}
              onChange={e => setFixtureForm(f => ({ ...f, competition: e.target.value }))}
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
          const fixtureDateKey = dateKey(f.date);
          const groups = role === "manager" && fixtureDateKey
            ? AVAILABILITY_STATUS_GROUPS.map(g => ({
                ...g,
                players: players.filter(p => (availability[fixtureDateKey]?.[p.id] || "unset") === g.key),
              }))
            : [];
          return (
            <Panel key={f.id} className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold">{f.homeTeam} <span style={{ color: COLORS.chalkDim }}>vs</span> {f.awayTeam}</div>
                <div style={{ color: COLORS.chalkDim }} className="text-xs mt-0.5">{formatFixtureDate(f.date)} · {f.venue} · {f.competition} · {f.type}</div>
                {groups.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {groups.map(g => (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => setModal({ fixture: f, group: g })}
                        style={{ color: g.color, border: `1px solid ${g.color}55` }}
                        className="text-[11px] px-2 py-1 rounded-md flex items-center gap-1"
                      >
                        {g.label} <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{g.players.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge subtle color={f.status === "played" ? COLORS.sky : COLORS.chalkDim}>{f.status}</Badge>
              </div>
            </Panel>
          );
        })}
      </div>
      {modal && (
        <Modal title={`${modal.group.label} · ${modal.fixture.opponent}`} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-1">
            {modal.group.players.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-sm py-1" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <ShirtBadge number={p.number} size={22} /> {p.name}
              </div>
            ))}
            {modal.group.players.length === 0 && <div style={{ color: COLORS.chalkDim }} className="text-sm">None</div>}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Availability ----------
function AvailabilityRow({ p, date, val, locked, setAvail }) {
  const [notice, setNotice] = useState(false);

  function handleClick(opt) {
    if (locked) {
      setNotice(true);
      setTimeout(() => setNotice(false), 6000);
      return;
    }
    setAvail(date, p.id, opt);
  }

  return (
    <div>
      <div className="flex items-center justify-between text-sm py-1" style={{ borderTop: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center gap-2"><ShirtBadge number={p.number} size={24} /> {p.name}</div>
        <div className="flex gap-1">
          {["yes", "maybe", "no"].map(opt => {
            const active = val === opt;
            const c = opt === "yes" ? COLORS.green : opt === "maybe" ? COLORS.gold : COLORS.clay;
            return (
              <button key={opt} onClick={() => handleClick(opt)}
                style={{ background: active ? c + "33" : "transparent", border: `1px solid ${active ? c : COLORS.line}`, color: active ? c : COLORS.chalkDim }}
                className="text-[11px] px-2 py-1 rounded-md capitalize">
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      {notice && (
        <div style={{ color: COLORS.clay }} className="text-xs pb-1.5">
          You can't change availability so close to a game. You can try explain this move to Luke personally.
        </div>
      )}
    </div>
  );
}

function AvailabilityTab({ fixtures, players, availability, setAvail, role, activePlayerId }) {
  const [from, setFrom] = useState(() => toInputDate(new Date()));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 84);
    return toInputDate(d);
  });

  const relevantPlayers = role === "player" ? players.filter(p => p.id === activePlayerId) : players;
  const sundays = useMemo(() => getSundaysBetween(from, to), [from, to]);
  const fixtureByDate = useMemo(() => {
    const map = {};
    fixtures.forEach(f => {
      const key = dateKey(f.date);
      if (key) map[key] = f;
    });
    return map;
  }, [fixtures]);

  return (
    <div>
      <SectionHeading
        eyebrow={role === "player" ? "Set your own status" : "Squad availability"}
        title="Availability"
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <label style={{ color: COLORS.chalkDim }} className="text-xs flex items-center gap-1.5">
              From
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
                className="text-sm px-2 py-1.5 rounded-md" />
            </label>
            <label style={{ color: COLORS.chalkDim }} className="text-xs flex items-center gap-1.5">
              To
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
                className="text-sm px-2 py-1.5 rounded-md" />
            </label>
          </div>
        }
      />
      {sundays.length === 0 && <Panel><div style={{ color: COLORS.chalkDim }} className="text-sm">No Sundays in the selected date range.</div></Panel>}
      <div className="flex flex-col gap-5">
        {sundays.map(date => {
          const fixture = fixtureByDate[date];
          return (
            <Panel key={date}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-sm font-semibold">
                  {formatShortDate(date)}
                  {fixture && <span style={{ color: COLORS.chalkDim, fontWeight: 400 }}> · {fixture.opponent}</span>}
                </div>
                {fixture ? (
                  <Badge subtle color={COLORS.sky}>{fixture.homeTeam.startsWith("West Bridgford") ? "Home" : "Away"}</Badge>
                ) : (
                  <Badge subtle color={COLORS.chalkDim}>No fixture scheduled</Badge>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                {relevantPlayers.map(p => {
                  const val = availability[date]?.[p.id] || "unset";
                  const locked = role === "player" && isAvailabilityLocked(date);
                  return <AvailabilityRow key={p.id} p={p} date={date} val={val} locked={locked} setAvail={setAvail} />;
                })}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Squads ----------
function LineupsTab({ fixtures, players, availability, lineups, lineupFixtureId, setLineupFixtureId, assignSlot, toggleSub, selectCaptain, role }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const fixture = fixtures.find(f => f.id === lineupFixtureId) || fixtures[0];
  const current = fixture ? (lineups[fixture.id] || { starters: {}, subs: [], captain: null }) : { starters: {}, subs: [], captain: null };
  const fixtureDateKey = fixture ? dateKey(fixture.date) : null;
  const availableIds = fixture ? players.filter(p => availability[fixtureDateKey]?.[p.id] === "yes").map(p => p.id) : [];
  const usedIds = new Set([...Object.values(current.starters), ...current.subs]);

  if (role !== "manager") return <div><SectionHeading eyebrow="Manager access" title="Matchday Squads" /><Panel><div style={{ color: COLORS.chalkDim }}>Squad selection is available to managers only.</div></Panel></div>;
  if (!fixture) return <div><SectionHeading eyebrow="Team selection" title="Matchday Squads" /><Panel><div style={{ color: COLORS.chalkDim }}>No upcoming fixture to set a squad for.</div></Panel></div>;

  function handlePlayerClick(playerId) {
    const targetSlot = selectedSlot || FORMATION.find(slot => !current.starters[slot.key])?.key;
    if (!targetSlot) return;
    assignSlot(fixture.id, targetSlot, playerId);
    setSelectedSlot(null);
  }

  return (
    <div>
      <SectionHeading
        eyebrow="Team selection"
        title="Matchday Squads"
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <select value={fixture.id} onChange={e => setLineupFixtureId(e.target.value)}
              style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
              className="text-sm px-3 py-2 rounded-md">
              {fixtures.map(f => <option key={f.id} value={f.id}>{f.opponent} · {f.date}</option>)}
            </select>
            <button
              type="button"
              disabled={availableIds.length === 0}
              onClick={() => {
                const previewWindow = window.open("", "_blank");
                downloadSquadPng(fixture, players.filter(p => availableIds.includes(p.id)), current.captain, previewWindow);
              }}
              style={{ background: COLORS.gold, color: COLORS.bg, opacity: availableIds.length ? 1 : 0.5 }}
              className="text-xs font-semibold px-3 py-2 rounded-md flex items-center gap-1.5"
            >
              <Download size={14} /> Create squad PNG
            </button>
          </div>
        }
      />
      <Panel className="mb-4">
        <div style={{ color: COLORS.chalkDim }} className="text-sm">Select a pitch position, then click a player name to add them. Without a selected position, players fill the next empty position.</div>
      </Panel>
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
                <div key={slot.key} onClick={() => setSelectedSlot(slot.key)} style={{ position: "absolute", top: `${slot.top}%`, left: `${slot.left}%`, transform: "translate(-50%,-50%)" }} className="flex flex-col items-center">
                  <select
                    disabled={role !== "manager"}
                    value={pid || ""}
                    onChange={e => assignSlot(fixture.id, slot.key, e.target.value || null)}
                    style={{
                      background: selectedSlot === slot.key ? COLORS.green : player ? COLORS.gold : "#0F281888",
                      color: player ? COLORS.bg : COLORS.chalk,
                      border: `2px solid ${selectedSlot === slot.key ? COLORS.green : COLORS.gold}88`,
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
          <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-3">Available squad · yes only · {availableIds.length}</div>
          <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto pr-1">
            {players.filter(p => availableIds.includes(p.id)).map(p => {
              const inSub = current.subs.includes(p.id);
              const inStart = Object.values(current.starters).includes(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between text-sm py-1.5" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <button type="button" onClick={() => handlePlayerClick(p.id)} className="flex items-center gap-2 text-left hover:text-[#E9E4D4]">
                    <ShirtBadge number={p.number} size={24} /> {p.name}
                  </button>
                  <div className="flex items-center gap-1.5">
                    {inStart ? <Badge color={COLORS.gold}>Starting</Badge> :
                    <button disabled={role !== "manager"} onClick={() => toggleSub(fixture.id, p.id)}
                      style={{ background: inSub ? COLORS.sky+"33" : "transparent", border: `1px solid ${inSub ? COLORS.sky : COLORS.line}`, color: inSub ? COLORS.sky : COLORS.chalkDim }}
                      className="text-[11px] px-2 py-1 rounded-md">
                      {inSub ? "On bench" : "Add to bench"}
                    </button>}
                    <button type="button" onClick={() => selectCaptain(fixture.id, p.id)}
                      style={{ color: current.captain === p.id ? COLORS.gold : COLORS.chalkDim, border: `1px solid ${current.captain === p.id ? COLORS.gold : COLORS.line}` }}
                      className="text-[10px] px-1.5 py-1 rounded-md">
                      {current.captain === p.id ? "Captain" : "C"}
                    </button>
                  </div>
                </div>
              );
            })}
            {availableIds.length === 0 && <div style={{ color: COLORS.chalkDim }} className="text-sm">No players marked available yet.</div>}
          </div>
        </Panel>
      </div>

      <Panel className="mt-4">
        <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider mb-3">Availability breakdown</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: "yes", label: "Available", color: COLORS.green },
            { key: "maybe", label: "Maybe", color: COLORS.gold },
            { key: "no", label: "Not available", color: COLORS.clay },
            { key: "unset", label: "No response", color: COLORS.chalkDim },
          ].map(({ key, label, color }) => {
            const group = players.filter(p => (availability[fixtureDateKey]?.[p.id] || "unset") === key);
            return (
              <div key={key}>
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <Badge color={color}>{label} · {group.length}</Badge>
                  {key === "unset" && (
                    <WhatsAppChaseButton
                      disabled={group.length === 0}
                      buildMessage={() => `Chasing availability for ${fixture.opponent} game on ${formatShortDate(fixtureDateKey)} for the following players: ${group.map(p => p.name).join(", ")}. Please log on here and set availability asap: ${getSiteUrl()}`}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {group.map(p => (
                    <div key={p.id} className="flex items-center gap-2 text-sm py-0.5">
                      <ShirtBadge number={p.number} size={20} /> {p.name}
                    </div>
                  ))}
                  {group.length === 0 && <div style={{ color: COLORS.chalkDim }} className="text-xs">None</div>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ---------- Subs ----------
function SubsTab({ players, payments, setPaymentStatus, role }) {
  const [monthOffset, setMonthOffset] = useState(0);

  if (role !== "manager") return <div><SectionHeading eyebrow="Manager access" title="Subs" /><Panel><div style={{ color: COLORS.chalkDim }}>Subs tracking is available to managers only.</div></Panel></div>;

  const months = [monthOffset - 1, monthOffset, monthOffset + 1].map(monthKey);
  const columns = [
    { period: "sign_on", label: "Sign-on fee" },
    ...months.map(period => ({ period, label: monthLabel(period) })),
  ];

  return (
    <div>
      <SectionHeading
        eyebrow="Manager access"
        title="Subs"
        right={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setMonthOffset(o => o - 1)}
              style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
              className="p-1.5 rounded-md"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => setMonthOffset(o => o + 1)}
              style={{ background: COLORS.panel, border: `1px solid ${COLORS.line}`, color: COLORS.chalk }}
              className="p-1.5 rounded-md"><ChevronRight size={16} /></button>
          </div>
        }
      />
      <Panel style={{ padding: 0 }}>
        <div className="overflow-auto" style={{ maxHeight: "70vh" }}>
          <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="text-left py-2 px-3"
                  style={{ color: COLORS.chalkDim, fontWeight: 500, background: COLORS.panel, position: "sticky", top: 0, left: 0, zIndex: 3, borderBottom: `1px solid ${COLORS.line}`, borderRight: `1px solid ${COLORS.line}` }}
                >
                  Player
                </th>
                {columns.map(col => {
                  const unpaid = players.filter(p => (payments[col.period]?.[p.id] || "unpaid") === "unpaid");
                  return (
                    <th
                      key={col.period}
                      className="text-left py-2 px-3"
                      style={{ color: COLORS.chalkDim, fontWeight: 500, minWidth: 160, background: COLORS.panel, position: "sticky", top: 0, zIndex: 2, borderBottom: `1px solid ${COLORS.line}` }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{col.label}</span>
                        <WhatsAppChaseButton
                          disabled={unpaid.length === 0}
                          buildMessage={() => col.period === "sign_on"
                            ? `Chasing the sign-on fee for the following players: ${unpaid.map(p => p.name).join(", ")}. Please sort this ASAP, thanks.`
                            : `Chasing ${col.label} subs payment for the following players: ${unpaid.map(p => p.name).join(", ")}. Please sort this ASAP, thanks.`}
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id}>
                  <td
                    className="py-2 px-3"
                    style={{ background: COLORS.panel, position: "sticky", left: 0, zIndex: 1, borderTop: `1px solid ${COLORS.line}`, borderRight: `1px solid ${COLORS.line}` }}
                  >
                    <div className="flex items-center gap-2"><ShirtBadge number={p.number} size={24} /> {p.name}</div>
                  </td>
                  {columns.map(col => {
                    const val = payments[col.period]?.[p.id] || "unpaid";
                    return (
                      <td key={col.period} className="py-2 px-3" style={{ borderTop: `1px solid ${COLORS.line}` }}>
                        <div className="flex gap-1">
                          {["paid", "unpaid"].map(opt => {
                            const active = val === opt;
                            const c = opt === "paid" ? COLORS.green : COLORS.clay;
                            return (
                              <button key={opt} onClick={() => setPaymentStatus(col.period, p.id, opt)}
                                style={{ background: active ? c + "33" : "transparent", border: `1px solid ${active ? c : COLORS.line}`, color: active ? c : COLORS.chalkDim }}
                                className="text-[11px] px-2 py-1 rounded-md capitalize">
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {players.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="py-3 text-sm" style={{ color: COLORS.chalkDim }}>No players registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
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
  const lastScraped = sortedTable.find(t => t.scraped_at)?.scraped_at;
  return (
    <div>
      <SectionHeading
        title="League Table"
        right={
          <button onClick={refreshScrape} disabled={scraping} style={{ background: COLORS.panel2, color: COLORS.gold, border: `1px solid ${COLORS.gold}55` }} className="text-sm px-3 py-2 rounded-md flex items-center gap-2">
            <RefreshCw size={14} className={scraping ? "animate-spin" : ""} /> {scraping ? "Refreshing…" : "Reload latest"}
          </button>
        }
      />
      {sortedTable.length === 0 ? (
        <Panel><p style={{ color: COLORS.chalkDim }} className="text-sm">No league table data yet — it fills in after the next daily scrape.</p></Panel>
      ) : (
        <Panel style={{ padding: 0 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: COLORS.chalkDim, borderBottom: `1px solid ${COLORS.line}` }} className="text-xs uppercase text-left">
                  <th className="py-2 px-3">#</th><th className="px-2">Team</th><th className="px-2">P</th><th className="px-2">W</th><th className="px-2">D</th><th className="px-2">L</th><th className="px-2">GD</th><th className="px-2">Pts</th>
                </tr>
              </thead>
              <tbody>
                {sortedTable.map(t => {
                  const isUs = t.team.startsWith("West Bridgford");
                  return (
                    <tr key={t.team} style={{ borderBottom: `1px solid ${COLORS.line}`, background: isUs ? COLORS.panel2 : "transparent" }}>
                      <td className="py-2 px-3" style={{ color: COLORS.chalkDim }}>{t.pos}</td>
                      <td className="px-2 font-medium" style={{ color: isUs ? COLORS.gold : COLORS.chalk }}>{t.team}</td>
                      <td className="px-2">{t.played}</td><td className="px-2">{t.won}</td><td className="px-2">{t.drawn}</td><td className="px-2">{t.lost}</td>
                      <td className="px-2">{t.goal_diff > 0 ? "+" : ""}{t.goal_diff}</td>
                      <td className="px-2 font-semibold">{t.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {lastScraped && (
        <div style={{ color: COLORS.chalkDim }} className="text-xs mt-3 flex items-center gap-1.5">
          <Info size={12}/> Last updated {new Date(lastScraped).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}.
        </div>
      )}
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
function AnalysisTab({ analysis, rankedForSelection, rankedForImpact, topScorers, topAssists, role }) {
  const goalsChart = topScorers.slice(0, 8).map(p => ({ name: p.name.split(" ")[0] + " " + p.name.split(" ")[1][0] + ".", goals: p.goals, assists: p.assists }));
  const scatterData = analysis.filter(a => a.apps > 0).map(a => ({ x: a.avgDiff, y: a.avgRating, name: a.name, z: a.apps }));

  return (
    <div>
      <SectionHeading eyebrow="Team performance" title="Analysis" />

      <div className={`grid grid-cols-1 gap-4 mb-5 ${role === "manager" ? "md:grid-cols-2" : ""}`}>
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

        {role === "manager" && (
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
        )}
      </div>

      {role === "manager" && (
        <>
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

          <Panel style={{ padding: 0 }} className="mt-4">
            <div className="p-4 pb-2 flex items-center gap-2">
              <Shirt size={15} color={COLORS.gold} />
              <div style={{ color: COLORS.chalkDim }} className="text-xs uppercase tracking-wider">Impact score — minutes, clean sheets &amp; goal contributions</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: COLORS.chalkDim, borderBottom: `1px solid ${COLORS.line}` }} className="text-xs uppercase text-left">
                    <th className="py-2 px-3">Player</th><th className="px-2">Pos</th><th className="px-2">Apps</th><th className="px-2">Avg mins</th><th className="px-2">Clean sheets</th><th className="px-2">G+A</th><th className="px-2">Impact score</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedForImpact.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                      <td className="py-2 px-3 flex items-center gap-2">
                        <span style={{ color: i < 3 ? COLORS.gold : COLORS.chalkDim, fontFamily: "'JetBrains Mono', monospace" }} className="text-xs w-4">{i+1}</span>
                        <ShirtBadge number={p.number} size={24} /> {p.name}
                      </td>
                      <td className="px-2"><Badge subtle color={COLORS.sky}>{p.pos}</Badge></td>
                      <td className="px-2">{p.apps}</td>
                      <td className="px-2">{p.avgMinutes.toFixed(0)}'</td>
                      <td className="px-2">{(p.pos === "GK" || p.pos === "DEF") ? p.cleanSheets : "—"}</td>
                      <td className="px-2">{(p.pos === "MID" || p.pos === "FWD") ? `${p.goals}+${p.assists}` : "—"}</td>
                      <td className="px-2 font-semibold" style={{ color: COLORS.gold }}>{p.avgImpact.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <div style={{ color: COLORS.chalkDim }} className="text-xs mt-3">
            Impact score = rating, plus credit for minutes played, a bonus for GK/DEF clean sheets (playing 60+ minutes in a match with no goals conceded), and a bonus per goal/assist for MID/FWD — with the whole total then weighted up or down by how tough the opponent was, same as the selection index.
          </div>
        </>
      )}
    </div>
  );
}
