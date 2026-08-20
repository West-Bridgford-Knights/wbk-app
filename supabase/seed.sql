-- Replace all existing team data with the supplied squad and fixtures.
-- Run this after schema.sql in the Supabase SQL Editor.

truncate table public.availability, public.lineups, public.results, public.fixtures, public.players restart identity cascade;

insert into public.players (id, name, number, pos) values
  ('p1', 'Opeyemi Adeleke', 1, 'MID'),
  ('p2', 'David Adeyemo', 2, 'DEF'),
  ('p3', 'Matthew Blaze', 3, 'DEF'),
  ('p4', 'Jacob Brown', 4, 'DEF'),
  ('p5', 'Joseph Bullock', 5, 'MID'),
  ('p6', 'Jack Carnell', 6, 'DEF'),
  ('p7', 'James Chiu', 7, 'MID'),
  ('p8', 'Tom Cilvert', 8, 'MID'),
  ('p9', 'Ed Cochrane', 9, 'DEF'),
  ('p10', 'Harry Cockerham', 10, 'MID'),
  ('p11', 'Mark Coulthard', 11, 'MID'),
  ('p12', 'Nathan Cox', 12, 'MID'),
  ('p13', 'Morgan Davies-Brown', 13, 'MID'),
  ('p14', 'Peter Draper', 14, 'DEF'),
  ('p15', 'Harry Eggleston', 15, 'FWD'),
  ('p16', 'Harry Fitzjohn', 16, 'MID'),
  ('p17', 'Gregory Hallford', 17, 'MID'),
  ('p18', 'Thomas Harrison', 18, 'MID'),
  ('p19', 'Ben Hawksworth', 19, 'MID'),
  ('p20', 'Daniel Hemmings', 20, 'DEF'),
  ('p21', 'Joel Holmes', 21, 'DEF'),
  ('p22', 'Harman Khosa', 22, 'MID'),
  ('p23', 'Andrew Kirkwood', 23, 'GK'),
  ('p24', 'Nicholas Kirkwood', 24, 'MID'),
  ('p25', 'Stijn Lenders', 25, 'DEF'),
  ('p26', 'Hamish Llewelyn', 26, 'FWD'),
  ('p27', 'John Lowe', 27, 'MID'),
  ('p28', 'Tom Marshall', 28, 'DEF'),
  ('p29', 'Elliott Matter', 29, 'MID'),
  ('p30', 'Luke Maxted', 30, 'FWD'),
  ('p31', 'Declan McNally', 31, 'MID'),
  ('p32', 'Will Rainford', 32, 'MID'),
  ('p33', 'Christopher Ryder', 33, 'FWD'),
  ('p34', 'Brandon Vandenhende', 34, 'FWD'),
  ('p35', 'Thomas Vasey', 35, 'MID'),
  ('p36', 'Tomoya Wada', 36, 'FWD'),
  ('p37', 'Matteo', 37, 'FWD'),
  ('p38', 'Alex', 38, 'MID'),
  ('p39', 'Jack', 39, 'FWD'),
  ('p40', 'Aiden', 40, 'DEF'),
  ('p41', 'David Nice', 41, 'DEF'),
  ('p42', 'Ross Whiting', 42, 'FWD');

-- Fixture ids use the "fa-<id>" scheme keyed off the FA Full-Time fixture id (from each
-- fixture's displayFixture.html?id=... link), matching what scripts/scrape-fixtures.mjs
-- upserts on every scrape — so a scrape after this seed updates these rows in place
-- instead of inserting duplicates.
insert into public.fixtures
  (id, type, date, home_team, away_team, opponent, venue, competition, status, opp_pos)
values
  ('fa-30058065', 'L', '2026-09-06T10:30', 'West Bridgford Knights F.C.', 'Fanzines United A', 'Fanzines United A', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058070', 'L', '2026-09-13T10:30', 'Shire Athletic F.C.', 'West Bridgford Knights F.C.', 'Shire Athletic F.C.', 'South Notts Academy, Radcliffe-on-Trent', 'One', 'upcoming', 6),
  ('fa-30391371', 'CC', '2026-09-20T10:30', 'West Bridgford Knights F.C.', 'Bridgford Villa FC Mens', 'Bridgford Villa FC Mens', 'GRESHAM SPORTS PARK', 'Sunday Senior Trophy', 'upcoming', 6),
  ('fa-30058085', 'L', 'TBC', 'West Bridgford Knights F.C.', 'Notts Lions', 'Notts Lions', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058090', 'L', '2026-10-11T10:30', 'Radcliffe Olympic FC', 'West Bridgford Knights F.C.', 'Radcliffe Olympic FC', 'Radcliffe Olympic FC', 'One', 'upcoming', 6),
  ('fa-30058095', 'L', '2026-10-18T10:30', 'West Bridgford Knights F.C.', 'Notts. Medics F.C', 'Notts. Medics F.C', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058100', 'L', '2026-10-25T10:30', 'West Bridgford Knights F.C.', 'Bilborough TRD FC', 'Bilborough TRD FC', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058101', 'L', '2026-11-01T10:30', 'Bilborough TRD FC', 'West Bridgford Knights F.C.', 'Bilborough TRD FC', 'Harvey Hadden', 'One', 'upcoming', 6),
  ('fa-30058110', 'L', '2026-11-08T10:30', 'West Bridgford Knights F.C.', 'Legion F.C', 'Legion F.C', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058111', 'L', '2026-11-15T10:30', 'Fanzines United A', 'West Bridgford Knights F.C.', 'Fanzines United A', 'Elms Park, Ruddington #1', 'One', 'upcoming', 6),
  ('fa-30058120', 'L', '2026-11-22T10:30', 'West Bridgford Knights F.C.', 'Shire Athletic F.C.', 'Shire Athletic F.C.', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058121', 'L', '2026-11-29T10:30', 'Tollerton F.C.', 'West Bridgford Knights F.C.', 'Tollerton F.C.', 'East Leake Leisure Centre, #1', 'One', 'upcoming', 6),
  ('fa-30058130', 'L', '2026-12-06T10:30', 'West Bridgford Knights F.C.', 'Stratford Haven F.C', 'Stratford Haven F.C', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058131', 'L', 'TBC', 'Notts Lions', 'West Bridgford Knights F.C.', 'Notts Lions', 'Dunkirk FC #1', 'One', 'upcoming', 6),
  ('fa-30058075', 'L', '2026-12-13T10:30', 'West Bridgford Knights F.C.', 'Tollerton F.C.', 'Tollerton F.C.', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058140', 'L', '2027-01-03T10:30', 'West Bridgford Knights F.C.', 'Radcliffe Olympic FC', 'Radcliffe Olympic FC', 'Gresham Sports Park #5', 'One', 'upcoming', 6),
  ('fa-30058060', 'L', '2027-01-17T10:30', 'Legion F.C', 'West Bridgford Knights F.C.', 'Legion F.C', 'Titchfield Park, Hucknall 2', 'One', 'upcoming', 6),
  ('fa-30058080', 'L', '2027-01-24T10:30', 'Stratford Haven F.C', 'West Bridgford Knights F.C.', 'Stratford Haven F.C', 'Gresham Sports Park #4', 'One', 'upcoming', 6),
  ('fa-30058141', 'L', '2027-02-28T10:30', 'Notts. Medics F.C', 'West Bridgford Knights F.C.', 'Notts. Medics F.C', 'Riverside Sports Centre Riverside Sports Centre 5', 'One', 'upcoming', 6);
