import { supabase } from "./supabase";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

async function selectAll(table, orderBy) {
  const client = requireClient();
  let query = client.from(table).select("*");
  if (orderBy) query = query.order(orderBy);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function upsertRows(table, rows) {
  if (!rows.length) return;
  const { error } = await requireClient().from(table).upsert(rows);
  if (error) throw error;
}

function fixtureToRow(fixture) {
  return {
    id: fixture.id,
    type: fixture.type,
    date: fixture.date,
    home_team: fixture.homeTeam,
    away_team: fixture.awayTeam,
    opponent: fixture.opponent,
    venue: fixture.venue,
    competition: fixture.competition,
    status: fixture.status,
    opp_pos: fixture.oppPos,
  };
}

function fixtureFromRow(row) {
  return {
    id: row.id,
    type: row.type,
    date: row.date,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    opponent: row.opponent,
    venue: row.venue,
    competition: row.competition,
    status: row.status,
    oppPos: row.opp_pos,
    scrapedAt: row.scraped_at,
  };
}

export async function loadAppData() {
  const [players, fixtures, availabilityRows, lineupRows, resultRows, leagueTable] = await Promise.all([
    selectAll("players", "number"),
    selectAll("fixtures", "date"),
    selectAll("availability"),
    selectAll("lineups"),
    selectAll("results"),
    selectAll("league_table", "pos"),
  ]);

  return {
    players,
    fixtures: fixtures.map(fixtureFromRow),
    leagueTable,
    availability: availabilityRows.reduce((all, row) => ({
      ...all,
      [row.date]: { ...(all[row.date] || {}), [row.player_id]: row.status },
    }), {}),
    lineups: lineupRows.reduce((all, row) => ({
      ...all,
      [row.fixture_id]: { starters: row.starters || {}, subs: row.subs || [], captain: row.captain_id || null },
    }), {}),
    results: resultRows.reduce((all, row) => ({
      ...all,
      [row.fixture_id]: { ourScore: row.our_score, theirScore: row.their_score, stats: row.stats || {} },
    }), {}),
  };
}

export async function loadLeagueTable() {
  return selectAll("league_table", "pos");
}

export async function loadFixtures() {
  const rows = await selectAll("fixtures", "date");
  return rows.map(fixtureFromRow);
}

export async function savePlayer(player) {
  await upsertRows("players", [player]);
}

export async function saveFixture(fixture) {
  await upsertRows("fixtures", [fixtureToRow(fixture)]);
}

export async function saveAvailability(date, playerId, status) {
  await upsertRows("availability", [{ date, player_id: playerId, status }]);
}

export async function saveLineup(fixtureId, lineup) {
  await upsertRows("lineups", [{
    fixture_id: fixtureId,
    starters: lineup.starters || {},
    subs: lineup.subs || [],
    captain_id: lineup.captain || null,
  }]);
}

export async function saveResult(fixtureId, result) {
  const client = requireClient();
  const { error: resultError } = await client.from("results").upsert([{
    fixture_id: fixtureId,
    our_score: result.ourScore,
    their_score: result.theirScore,
    stats: result.stats || {},
  }]);
  if (resultError) throw resultError;

  const { error: fixtureError } = await client
    .from("fixtures")
    .update({ status: "played" })
    .eq("id", fixtureId);
  if (fixtureError) throw fixtureError;
}
