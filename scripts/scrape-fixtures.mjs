import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const execFileAsync = promisify(execFile);

const FIXTURES_URL =
  "https://fulltime.thefa.com/fixtures/1/50.html?selectedSeason=800979694&selectedFixtureGroupAgeGroup=0&previousSelectedFixtureGroupAgeGroup=&selectedFixtureGroupKey=1_878472488&previousSelectedFixtureGroupKey=1_878472488&selectedDateCode=all&selectedRelatedFixtureOption=3&selectedClub=&previousSelectedClub=&selectedTeam=541715342&selectedFixtureDateStatus=&selectedFixtureStatus=";

const CLUB_NAME = "West Bridgford Knights F.C.";
const DEFAULT_OPP_POS = 6;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY must be set.");
  process.exit(1);
}

async function fetchFixturesHtml() {
  // FA Full-Time sits behind Cloudflare, which blocks Node's fetch() (undici) on
  // TLS/HTTP client fingerprint alone — a plain curl request with the same headers
  // passes, so shell out to curl rather than using fetch().
  const { stdout } = await execFileAsync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--fail",
      "--location",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--header",
      "Accept-Language: en-GB,en;q=0.9",
      FIXTURES_URL,
    ],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  return stdout;
}

function toIsoDate(text) {
  const cleaned = (text || "").trim();
  if (!cleaned || cleaned.toUpperCase() === "TBC") return "TBC";
  const m = cleaned.match(/(\d{2})\/(\d{2})\/(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (!m) return "TBC";
  const [, dd, mm, yy, hh = "00", min = "00"] = m;
  const year = 2000 + Number(yy);
  return `${year}-${mm}-${dd}T${hh}:${min}`;
}

function parseFixtures(html) {
  const $ = cheerio.load(html);
  const rows = [];

  $(".fixtures-table table tbody tr").each((_, tr) => {
    const $tr = $(tr);
    const idHref = $tr.find('a[href*="id="]').first().attr("href") || "";
    const idMatch = idHref.match(/id=(\d+)/);
    if (!idMatch) return;
    const faId = idMatch[1];

    let type = "";
    let homeTeam = "";
    let awayTeam = "";
    const leftCellDividers = [];

    $tr.children("td").each((__, td) => {
      const $td = $(td);
      const cls = $td.attr("class") || "";
      const text = $td.text().trim().replace(/\s+/g, " ");
      // The county-cup type cell embeds a hidden tooltip div (competition name) inside the
      // same <td> — .text() would pull that in too, so read only the visible link text.
      if (cls.includes("bold") && cls.includes("cell-divider")) type = $td.find("a").first().text().trim();
      else if (cls.includes("home-team")) homeTeam = text;
      else if (cls.includes("road-team")) awayTeam = text;
      else if (cls === "left cell-divider") leftCellDividers.push(text);
    });

    if (!homeTeam || !awayTeam) return;
    const isHome = homeTeam === CLUB_NAME;
    const isAway = awayTeam === CLUB_NAME;
    if (!isHome && !isAway) return; // not one of our fixtures

    const [dateText, ...rest] = leftCellDividers;
    // fixtures.venue is not-null — fall back to "" rather than null if the site ever omits
    // the Venue column for a row, so one odd row can't fail the whole upsert batch.
    const venue = rest.length > 1 ? rest[0] : "";
    const competition = rest.length > 1 ? rest[1] : rest[0] || "One";

    rows.push({
      id: `fa-${faId}`,
      type: type || "L",
      date: toIsoDate(dateText),
      home_team: homeTeam,
      away_team: awayTeam,
      opponent: isHome ? awayTeam : homeTeam,
      venue,
      competition,
      opp_pos: null, // filled in against the league table below
    });
  });

  return rows;
}

function attachOppPos(rows, leagueRows) {
  const posByTeam = new Map(leagueRows.map((r) => [r.team.trim().toLowerCase(), r.pos]));
  return rows.map((row) => ({
    ...row,
    opp_pos: posByTeam.get(row.opponent.trim().toLowerCase()) ?? DEFAULT_OPP_POS,
  }));
}

async function main() {
  const html = await fetchFixturesHtml();
  const parsed = parseFixtures(html);

  if (!parsed.length) {
    throw new Error("No fixtures parsed for our club — the page layout may have changed.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: leagueRows, error: leagueError } = await supabase.from("league_table").select("team,pos");
  if (leagueError) throw leagueError;

  const scrapedAt = new Date().toISOString();
  const rows = attachOppPos(parsed, leagueRows || []).map((row) => ({ ...row, scraped_at: scrapedAt }));

  // Upsert by id (not delete-all): the same FA fixture id maps to a stable row here, and we
  // deliberately omit "status" so a fixture a manager has already marked "played" (via
  // logging a result) is never reset back to "upcoming" by the daily rescrape. scraped_at is
  // stamped explicitly on every row since upsert leaves a plain default column untouched on update.
  const { error: upsertError } = await supabase.from("fixtures").upsert(rows);
  if (upsertError) throw upsertError;

  console.log(`Scraped and upserted ${rows.length} fixtures.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
