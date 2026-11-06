-- ============================================================================
-- OPTIONAL - clean the TEST catalogue data from the local Laravel DB
--
-- Removes ONLY the six known dummy room types created by earlier API tests
-- (all named "Oakwood Cottage", short description
-- "Charming 2-bedroom stone cottage"), their rooms and their rate plans.
--
-- It does NOT touch properties, amenities, media, CMS data or bookings.
-- It also does NOT touch the real imported cottages.
--
-- Safe to run before OR after roomtypes-import.sql:
--   * room_types are only deleted while they still have the dummy
--     short_description, so a row that was updated by the import survives.
--   * dummy rooms / rate plans are deleted by their exact known IDs.
-- ============================================================================

START TRANSACTION;

DELETE FROM `rate_plans` WHERE `id` IN ('14407b75cacc746460fb28e2', '4082983fd9c6d817cbc6be53', '4ca1f258d26f83932c11c571', '619e10ff7d164814b3c8edf6', '8f03e10f9e90365b023c4596');
DELETE FROM `rooms`      WHERE `id` IN ('62052f8a1955209b0965e092', 'a5e4a0d06a0402ade665363a', 'b1e44309e74371082e75e511', 'bbf4682a5bdade48520b8be1', 'd838eff4faf035b6ca55923a', 'f733704f05fb12eea460c142');

DELETE FROM `room_types`
WHERE `id` IN ('110e4f4aa75be62d632e0709', '5ba96bb5422f8b715020ebc6', '90039669355e621c70642dfe', '96aebe08d9f85c7d50874107', 'b48cd367c2f0d83a53054f34', 'd2272e5ca41f11122fac579a')
  AND `short_description` = 'Charming 2-bedroom stone cottage';

COMMIT;

-- Now run database/roomtypes-import.sql
