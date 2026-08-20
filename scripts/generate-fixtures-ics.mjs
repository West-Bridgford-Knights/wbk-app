import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY must be set.");
  process.exit(1);
}

const OUTPUT_PATH = path.resolve(process.cwd(), "public", "fixtures.ics");
const MATCH_DURATION_MINUTES = 120;

// Fixed daylight-saving rule for Europe/London: clocks go forward the last
// Sunday of March and back the last Sunday of October, both at 01:00 UTC.
function isBst(year, month, day, hour) {
  const lastSunday = (y, m) => {
    const d = new Date(Date.UTC(y, m + 1, 0));
    d.setUTCDate(d.getUTCDate() - d.getUTCDay());
    return d.getUTCDate();
  };
  const marchStart = Date.UTC(year, 2, lastSunday(year, 2), 1);
  const octEnd = Date.UTC(year, 9, lastSunday(year, 9), 1);
  const instant = Date.UTC(year, month, day, hour);
  return instant >= marchStart && instant < octEnd;
}

// `date` is a UK wall-clock time with no offset info ("YYYY-MM-DDTHH:MM"), so
// convert it to UTC using the BST rule above rather than trusting the host TZ.
function ukLocalToIcsUtc(dateStr) {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const year = Number(y);
  const month = mo - 1;
  const day = d;
  const hour = h;
  const minute = mi;
  const offsetHours = isBst(year, month, day, hour) ? 1 : 0;
  const utcMs = Date.UTC(year, month, day, hour - offsetHours, minute);
  return new Date(utcMs);
}

function formatIcsUtc(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// RFC 5545 §3.1: fold lines longer than 75 octets, continuation lines start with a space.
function foldLine(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines lose one octet to the leading space
  }
  return parts.join("\r\n ");
}

function buildEvent(fixture) {
  const start = ukLocalToIcsUtc(fixture.date);
  if (!start) return null;
  const end = new Date(start.getTime() + MATCH_DURATION_MINUTES * 60 * 1000);

  // `opponent` is set (by the scraper) to whichever of home/away isn't the Knights,
  // so the Knights are the away side exactly when the away slot holds the opponent.
  const isHome = fixture.away_team === fixture.opponent;
  const venueLabel = isHome ? "(H)" : "(A)";
  const summary = `WBK ${venueLabel} vs ${fixture.opponent}`;
  const descriptionParts = [fixture.competition, fixture.status === "played" ? "Result logged" : "Upcoming"].filter(
    Boolean
  );

  const lines = [
    "BEGIN:VEVENT",
    `UID:${fixture.id}@westbridgfordknights`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(start)}`,
    `DTEND:${formatIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(descriptionParts.join(" — "))}`,
  ];
  if (fixture.venue) lines.push(`LOCATION:${escapeIcsText(fixture.venue)}`);
  lines.push("END:VEVENT");
  return lines;
}

function buildCalendar(fixtures) {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//West Bridgford Knights//Fixtures//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:West Bridgford Knights Fixtures",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  const footer = ["END:VCALENDAR"];

  const eventLines = fixtures
    .map(buildEvent)
    .filter(Boolean)
    .flat();

  return [...header, ...eventLines, ...footer].map(foldLine).join("\r\n") + "\r\n";
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: fixtures, error } = await supabase.from("fixtures").select("*").order("date", { ascending: true });
  if (error) throw error;

  const withDates = (fixtures || []).filter((f) => f.date && f.date.toUpperCase() !== "TBC");
  const skipped = (fixtures || []).length - withDates.length;

  const ics = buildCalendar(withDates);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, ics, "utf8");

  console.log(`Wrote ${withDates.length} fixtures to ${OUTPUT_PATH}${skipped ? ` (skipped ${skipped} TBC)` : ""}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
