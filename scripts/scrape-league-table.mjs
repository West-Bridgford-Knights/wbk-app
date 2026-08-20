import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const execFileAsync = promisify(execFile);

const LEAGUE_TABLE_URL =
  "https://fulltime.thefa.com/table.html?league=2581263&selectedSeason=800979694&selectedDivision=53676971&selectedCompetition=0&selectedFixtureGroupKey=1_878472488";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("SUPABASE_URL and SUPABASE_ANON_KEY must be set.");
  process.exit(1);
}

async function fetchLeagueTableHtml() {
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
      LEAGUE_TABLE_URL,
    ],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  return stdout;
}

function parseLeagueTable(html) {
  const $ = cheerio.load(html);
  const table = $("table.cell-dividers").first();
  const headers = table.find("thead th").map((_, th) => $(th).text().trim().toUpperCase()).get();
  const colIndex = (label) => headers.indexOf(label);

  const col = {
    pos: colIndex("POS"),
    team: colIndex("TEAM"),
    played: colIndex("P"),
    won: colIndex("W"),
    drawn: colIndex("D"),
    lost: colIndex("L"),
    goalDiff: colIndex("GD"),
    points: colIndex("PTS"),
  };

  const rows = [];
  table.find("tbody tr").each((_, tr) => {
    const cells = $(tr).find("td").map((__, td) => $(td).text().trim()).get();
    if (!cells.length) return;
    rows.push({
      pos: Number(cells[col.pos]),
      team: cells[col.team],
      played: Number(cells[col.played]),
      won: Number(cells[col.won]),
      drawn: Number(cells[col.drawn]),
      lost: Number(cells[col.lost]),
      goal_diff: col.goalDiff >= 0 ? Number(cells[col.goalDiff]) : null,
      points: Number(cells[col.points]),
    });
  });

  return rows;
}

async function main() {
  const html = await fetchLeagueTableHtml();
  const rows = parseLeagueTable(html);

  if (!rows.length) {
    throw new Error("No league table rows parsed — the page layout may have changed.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { error: deleteError } = await supabase.from("league_table").delete().gt("pos", 0);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("league_table").insert(rows);
  if (insertError) throw insertError;

  console.log(`Scraped and stored ${rows.length} league table rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
