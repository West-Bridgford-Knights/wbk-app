import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);

// Pitchbooking has no public API docs — these were reverse-engineered from their own
// client bundle (pitchbooking.com's built JS references api.pitchbooking.com with this
// exact key). It's a client-side "publishable" key shipped to every visitor's browser,
// not a secret, the same trust model as a Stripe publishable key or Supabase anon key.
const PB_API_URL = "https://api.pitchbooking.com";
const PB_API_KEY = "1ag1Qg45a.d80161e2b6d5de787066e2665c42d2cd433c104e";

// The specific pitches we check for home fixtures. Add/remove entries here as the venues
// we book change. pitchSplit is how many of the facility's sub-divisions we need — the two
// Gresham ids are already the specific quarter/third product, so 1 means "this whole
// facility". Rushcliffe's facility is the combinable parent (quantity: 4 junior quarters,
// its own description says "2/4 = one half (adults)"), so getting the full adult-size pitch
// means requesting all 4, not 1 (which would only check a single junior quarter).
const FACILITIES = [
  { id: "d3bc83f0-a754-40a9-ba16-d7e31e00252d", pitchSplit: 1 }, // Gresham Sports Park - ATP2 (Quarters)
  { id: "36379e04-3e64-4a9c-b3c5-7b46be11db82", pitchSplit: 1 }, // Gresham Sports Park - ATP1 (Thirds)
  { id: "df95c884-396b-4d02-9719-4afaad1c1563", pitchSplit: 4 }, // Rushcliffe - 3G Floodlit Pitches (Bottom), full pitch
];

const CLUB_NAME = "West Bridgford Knights F.C.";
// Home fixtures need the pitch free from 10am to 12pm (kick-off + a buffer either side).
const WATCHED_SLOT_HOURS = [10, 11];
// Pitch booking sites rarely open more than a few weeks out — cap how many upcoming home
// fixtures we bother checking so the script stays fast and doesn't hammer their API.
const MAX_FIXTURES_TO_CHECK = 8;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY must be set.");
  process.exit(1);
}

// api.pitchbooking.com sits behind Cloudflare, same as the FA site — shell out to curl
// rather than fetch() for the same TLS-fingerprint reason as the other scrapers.
async function fetchWeekAvailability(facilityId, pitchSplit, anyDateInWeek) {
  const url =
    `${PB_API_URL}/api/facilities/${facilityId}/availability` +
    `?start_date=${anyDateInWeek}&pitch_split=${pitchSplit}&day_range=7&sub_facility_id=&selectedDuration=`;
  const { stdout } = await execFileAsync(
    "curl",
    [
      "--silent",
      "--show-error",
      "--fail",
      "--user-agent",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "--header", "Accept: application/json",
      "--header", "Content-Type: application/json",
      "--header", `Api-Key: ApiKey ${PB_API_KEY}`,
      "--header", `Referer: https://pitchbooking.com/book/facility/${facilityId}`,
      "--header", "Origin: https://pitchbooking.com",
      url,
    ],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  const body = JSON.parse(stdout);
  return body.data;
}

function toSlotStart(isoStartTime) {
  // "2026-08-23T10:00:00+01:00" -> "10:00"
  return isoStartTime.slice(11, 16);
}

function toDate(isoStartTime) {
  return isoStartTime.slice(0, 10);
}

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: fixtures, error: fixturesError } = await supabase
    .from("fixtures")
    .select("date,home_team,status")
    .eq("status", "upcoming")
    .eq("home_team", CLUB_NAME)
    .order("date");
  if (fixturesError) throw fixturesError;

  const targetDates = [...new Set(
    (fixtures || [])
      .map((f) => (f.date || "").slice(0, 10))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  )].slice(0, MAX_FIXTURES_TO_CHECK);

  if (!targetDates.length) {
    console.log("No upcoming home fixtures with a known date — nothing to check.");
    return;
  }

  // day_range=7 returns the whole Mon-Sun week containing start_date, so fixture dates
  // in the same week share one API call — group by the Monday of each date's week first.
  const weeksToFetch = [...new Set(targetDates.map(mondayOf))];

  const rows = [];
  const checkedAt = new Date().toISOString();

  for (const { id: facilityId, pitchSplit } of FACILITIES) {
    for (const weekStart of weeksToFetch) {
      const week = await fetchWeekAvailability(facilityId, pitchSplit, weekStart);

      for (const daySlots of Object.values(week.availableTimeSlotsForWeekByDay)) {
        for (const slot of daySlots) {
          const slotDate = toDate(slot.startTime);
          const hour = Number(toSlotStart(slot.startTime).slice(0, 2));
          if (!targetDates.includes(slotDate) || !WATCHED_SLOT_HOURS.includes(hour)) continue;
          rows.push({
            facility_id: facilityId,
            date: slotDate,
            slot_start: toSlotStart(slot.startTime),
            facility_name: week.name,
            available: !slot.unavailable,
            block_reason: slot.blockReason || null,
            checked_at: checkedAt,
          });
        }
      }
    }
  }

  if (!rows.length) {
    console.log("No matching slots found for the target fixture dates.");
    return;
  }

  const { error: upsertError } = await supabase.from("pitch_availability").upsert(rows);
  if (upsertError) throw upsertError;

  console.log(`Checked ${FACILITIES.length} pitch(es) for ${targetDates.length} fixture date(s), stored ${rows.length} slot rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
