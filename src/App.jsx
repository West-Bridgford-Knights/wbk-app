import { useEffect, useMemo, useState } from "react";
import {
  Users, CalendarDays, ClipboardCheck, Shirt, Trophy, TrendingUp,
  BarChart3, Star, Plus, X, RefreshCw, ChevronRight, ChevronLeft, Target, Zap, Download,
  LogIn, ShieldCheck, Info, Wallet, MessageCircle, MapPin, ExternalLink, CheckCircle2
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
  saveConfirmedPitch,
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

const DEFAULT_FORMATION = "4-3-3";
const FORMATIONS = {
  "4-3-3": [
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
  ],
  "4-4-2": [
    { key: "GK", label: "GK", top: 90, left: 50 },
    { key: "LB", label: "LB", top: 72, left: 15 },
    { key: "CB1", label: "CB", top: 76, left: 37 },
    { key: "CB2", label: "CB", top: 76, left: 63 },
    { key: "RB", label: "RB", top: 72, left: 85 },
    { key: "LM", label: "LM", top: 48, left: 12 },
    { key: "CM1", label: "CM", top: 52, left: 38 },
    { key: "CM2", label: "CM", top: 52, left: 62 },
    { key: "RM", label: "RM", top: 48, left: 88 },
    { key: "ST1", label: "ST", top: 16, left: 38 },
    { key: "ST2", label: "ST", top: 16, left: 62 },
  ],
  "3-5-2": [
    { key: "GK", label: "GK", top: 90, left: 50 },
    { key: "CB1", label: "CB", top: 74, left: 25 },
    { key: "CB2", label: "CB", top: 78, left: 50 },
    { key: "CB3", label: "CB", top: 74, left: 75 },
    { key: "LWB", label: "LWB", top: 52, left: 8 },
    { key: "CM1", label: "CM", top: 55, left: 32 },
    { key: "CM2", label: "CM", top: 58, left: 50 },
    { key: "CM3", label: "CM", top: 55, left: 68 },
    { key: "RWB", label: "RWB", top: 52, left: 92 },
    { key: "ST1", label: "ST", top: 16, left: 38 },
    { key: "ST2", label: "ST", top: 16, left: 62 },
  ],
  "4-2-3-1": [
    { key: "GK", label: "GK", top: 90, left: 50 },
    { key: "LB", label: "LB", top: 72, left: 15 },
    { key: "CB1", label: "CB", top: 76, left: 37 },
    { key: "CB2", label: "CB", top: 76, left: 63 },
    { key: "RB", label: "RB", top: 72, left: 85 },
    { key: "CDM1", label: "CDM", top: 58, left: 35 },
    { key: "CDM2", label: "CDM", top: 58, left: 65 },
    { key: "LW", label: "LW", top: 32, left: 15 },
    { key: "CAM", label: "CAM", top: 30, left: 50 },
    { key: "RW", label: "RW", top: 32, left: 85 },
    { key: "ST", label: "ST", top: 13, left: 50 },
  ],
};

const MANAGER_ONLY_TABS = ["lineups", "subs", "pitch"];

const TOTAL_TEAMS = 12;
const ACTIVE_PLAYER_STORAGE_KEY = "wbk-active-player-id";

// Unlisted read-only view of the next game's squad, reached only by knowing this exact
// query param — there's no real auth in this app (RLS is open to anon), so this is
// obscurity rather than a security boundary, same as everything else here.
const NEXT_GAME_SQUAD_KEY = "squad";
const NEXT_GAME_SQUAD_SECRET = "1b5c240e7c740d983ffe206b381f21eb";

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

function getNextFixture(fixtures) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return [...fixtures]
    .filter(f => f && f.date && f.date !== "TBC")
    .map(f => ({ ...f, sortDate: new Date(f.date) }))
    .filter(f => !Number.isNaN(f.sortDate.getTime()) && f.sortDate >= today)
    .sort((a, b) => a.sortDate - b.sortDate)[0] || null;
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
function Badge({ children, color = COLORS.gold, subtle, ...rest }) {
  return (
    <span
      {...rest}
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
    previewWindow.document.write(`<!doctype html><html><head><title>Squad vs ${fixture.opponent}</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><img src="${dataUrl}" style="display:block;width:100vw;height:100vh;object-fit:contain;background:#12162A" /></body></html>`);
    previewWindow.document.close();
  } else {
    const link = document.createElement("a");
    link.download = `match-day-squad-${fixture.id}.png`;
    link.href = dataUrl;
    link.click();
  }
}

async function downloadAvailabilityPng(fixture, groups, previewWindow) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1100;
  const context = canvas.getContext("2d");
  const navy = "#151A3A";
  const gold = COLORS.gold;
  const chalk = "#F5F3EE";
  const muted = "#C6C9D8";

  context.fillStyle = navy;
  context.fillRect(0, 0, 800, 1100);

  const sky = context.createLinearGradient(0, 0, 800, 1100);
  sky.addColorStop(0, "#29324B");
  sky.addColorStop(0.45, "#19213E");
  sky.addColorStop(1, "#0C1230");
  context.fillStyle = sky;
  context.fillRect(0, 0, 800, 1100);

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

  context.textAlign = "left";

  function drawGroup(group, x, y, width, height) {
    context.fillStyle = group.color;
    context.font = "bold 22px Arial, sans-serif";
    context.fillText(`${group.label.toUpperCase()} · ${group.players.length}`, x, y);
    context.strokeStyle = group.color;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y + 10);
    context.lineTo(x + width, y + 10);
    context.stroke();

    const nameAreaHeight = height - 44;
    const nameRowHeight = Math.min(26, nameAreaHeight / Math.max(group.players.length, 1));
    const fontSize = Math.max(11, Math.min(18, nameRowHeight - 6));
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    if (group.players.length === 0) {
      context.fillStyle = muted;
      context.font = "16px Arial, sans-serif";
      context.fillText("None", x, y + 44);
    } else {
      group.players.forEach((player, i) => {
        context.fillStyle = chalk;
        context.fillText(player.name.toUpperCase(), x, y + 44 + i * nameRowHeight);
      });
    }
  }

  // "Available" runs the full height of the left column; the rest stack on the right.
  const [leftGroup, ...rightGroups] = groups;
  const columnWidth = 300;
  const contentTop = 210;
  const contentHeight = 650;

  drawGroup(leftGroup, 86, contentTop, columnWidth, contentHeight);

  const rightGap = 24;
  const rightSectionHeight = (contentHeight - rightGap * (rightGroups.length - 1)) / rightGroups.length;
  rightGroups.forEach((group, i) => {
    const y = contentTop + i * (rightSectionHeight + rightGap);
    drawGroup(group, 424, y, columnWidth, rightSectionHeight);
  });

  const logo = new Image();
  logo.src = clubLogoUrl;
  await new Promise(resolve => {
    logo.onload = resolve;
    logo.onerror = resolve;
  });
  if (logo.complete && logo.naturalWidth) context.drawImage(logo, 390, 900, 338, 169);

  context.fillStyle = gold;
  context.fillRect(72, 1072, 656, 2);

  const dataUrl = canvas.toDataURL("image/png");
  if (previewWindow && !previewWindow.closed) {
    previewWindow.document.open();
    previewWindow.document.write(`<!doctype html><html><head><title>Availability vs ${fixture.opponent}</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><img src="${dataUrl}" style="display:block;width:100vw;height:100vh;object-fit:contain;background:#12162A" /></body></html>`);
    previewWindow.document.close();
  } else {
    const link = document.createElement("a");
    link.download = `match-day-availability-${fixture.id}.png`;
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
  const [pitchAvailability, setPitchAvailability] = useState({});
  const [pitchBookings, setPitchBookings] = useState({});
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
  const [lineupFixtureId, setLineupFixtureId] = useState(getNextFixture(fixtures)?.id || null);
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
        setPitchAvailability(data.pitchAvailability);
        setPitchBookings(data.pitchBookings);
        setResults(data.results);
        setLeagueTable(data.leagueTable);
        setLineupFixtureId(getNextFixture(data.fixtures)?.id || null);
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

  const secretSquadKey = new URLSearchParams(window.location.search).get(NEXT_GAME_SQUAD_KEY);
  if (secretSquadKey === NEXT_GAME_SQUAD_SECRET) {
    return <NextGameSquadView fixtures={fixtures} players={activePlayers} availability={availability} />;
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

  function setConfirmedPitch(fixtureId, facilityId) {
    setPitchBookings(prev => {
      const next = { ...prev };
      if (facilityId) next[fixtureId] = facilityId; else delete next[fixtureId];
      return next;
    });
    void saveConfirmedPitch(fixtureId, facilityId).catch(reportSaveError);
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

  function setFormation(fixtureId, formationKey) {
    const current = lineups[fixtureId] || { starters: {}, subs: [], captain: null };
    // Switching formation clears the pitch positions (slot keys differ between
    // formations) but keeps the bench and captain intact.
    const lineup = { ...current, formation: formationKey, starters: {} };
    setLineups(prev => ({ ...prev, [fixtureId]: lineup }));
    void saveLineup(fixtureId, lineup).catch(reportSaveError);
  }

  function toggleSquadMember(fixtureId, playerId) {
    const current = lineups[fixtureId] || { starters: {}, subs: [], captain: null, formation: DEFAULT_FORMATION };
    const currentSquad = effectiveSquadIds(current);
    const inSquad = currentSquad.includes(playerId);
    const squad = inSquad ? currentSquad.filter(id => id !== playerId) : [...currentSquad, playerId];
    let starters = current.starters || {};
    let subs = current.subs || [];
    if (inSquad) {
      // Dropping someone from the squad also clears any pitch slot or bench spot
      // they held, so the team sheet can't reference a player no longer in it.
      starters = { ...starters };
      Object.keys(starters).forEach(k => { if (starters[k] === playerId) delete starters[k]; });
      subs = subs.filter(id => id !== playerId);
    }
    const lineup = { ...current, squad, starters, subs };
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
    { key: "pitch", label: "Pitch Availability", icon: MapPin },
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
                fixtures={fixtures}
                upcoming={upcoming}
                played={played}
                results={results}
                topScorers={topScorers}
                setTab={setTab}
                role={role}
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
                assignSlot={assignSlot} toggleSub={toggleSub} selectCaptain={selectCaptain} setFormation={setFormation}
                toggleSquadMember={toggleSquadMember} role={role}
              />
            )}

            {tab === "subs" && (
              <SubsTab players={activePlayers} payments={payments} setPaymentStatus={setPaymentStatus} role={role} />
            )}

            {tab === "pitch" && (
              <PitchAvailabilityTab fixtures={upcoming} pitchAvailability={pitchAvailability} pitchBookings={pitchBookings} setConfirmedPitch={setConfirmedPitch} role={role} />
            )}

            {tab === "results" && (
              <ResultsTab
                fixtures={fixtures} results={results} players={players} lineups={lineups}
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
function Dashboard({ fixtures, upcoming, played, results, topScorers, setTab, role }) {
  const next = getNextFixture(fixtures);
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
            <button onClick={() => setTab("availability")} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm text-left px-3 py-2 rounded-md flex items-center justify-between">
              <span>Update availability</span><ChevronRight size={14} />
            </button>
            {role === "manager" && <button onClick={() => setTab("lineups")} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm text-left px-3 py-2 rounded-md flex items-center justify-between"><span>Set matchday squad</span><ChevronRight size={14} /></button>}
            {role === "manager" && <button onClick={() => setTab("results")} style={{ background: COLORS.panel2, color: COLORS.chalk }} className="text-sm text-left px-3 py-2 rounded-md flex items-center justify-between"><span>Log result</span><ChevronRight size={14} /></button>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------- Next game squad (unlisted read-only link) ----------
function NextGameSquadView({ fixtures, players, availability }) {
  const next = getNextFixture(fixtures);

  const dateStr = next ? dateKey(next.date) : null;
  const groups = AVAILABILITY_STATUS_GROUPS.map(g => ({
    ...g,
    players: players.filter(p => (availability[dateStr]?.[p.id] || "unset") === g.key),
  }));

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.chalk }} className="p-6 md:p-10">
      <div style={{ maxWidth: 720 }} className="mx-auto">
        <div className="flex items-center gap-2.5 mb-6">
          <CrestBadge size={38} />
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: COLORS.gold }} className="text-lg tracking-wide leading-none">
              WEST BRIDGFORD KNIGHTS
            </div>
            <div style={{ color: COLORS.chalkDim }} className="text-[11px] mt-0.5">Next game squad</div>
          </div>
        </div>

        {!next ? (
          <Panel><div style={{ color: COLORS.chalkDim }} className="text-sm">No upcoming fixture scheduled.</div></Panel>
        ) : (
          <>
            <Panel className="mb-5">
              <div className="text-lg font-semibold">vs {next.opponent}</div>
              <div style={{ color: COLORS.chalkDim }} className="text-sm mt-1">{formatFixtureDate(next.date)} · {next.venue}</div>
            </Panel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map(g => (
                <Panel key={g.key}>
                  <Badge color={g.color}>{g.label} · {g.players.length}</Badge>
                  <div className="flex flex-col gap-1 mt-3">
                    {g.players.map(p => (
                      <div key={p.id} className="flex items-center gap-2 text-sm py-0.5">
                        <ShirtBadge number={p.number} size={22} /> {p.name}
                      </div>
                    ))}
                    {g.players.length === 0 && <div style={{ color: COLORS.chalkDim }} className="text-xs">None</div>}
                  </div>
                </Panel>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
