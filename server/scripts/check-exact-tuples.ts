import { readFileSync } from "fs";

const sql = readFileSync("backups/clean_import.sql", "utf8");

// Find the line with INSERT INTO `roomtypes`
const line = sql.split(/\r?\n/).find(l => l.startsWith("INSERT INTO `roomtypes`"));

if (line) {
  // Count how many `('6ac` or tuple starts exist in the line
  const matches = line.match(/\('6ac/g);
  console.log("Total roomtype tuples in line:", matches ? matches.length : 0);
  console.log("Line length:", line.length);
} else {
  console.log("No INSERT INTO `roomtypes` found!");
}

// Same for amenities
const amenityLine = sql.split(/\r?\n/).find(l => l.startsWith("INSERT INTO `amenities`"));
if (amenityLine) {
  // Check if picsum is in amenityLine
  console.log("Picsum in amenities:", amenityLine.includes("picsum.photos"));
  console.log("cPanel in amenities:", amenityLine.includes("hamptworthstays.com/uploads/media/amenities"));
  // Count tuples
  const amenityTuples = (amenityLine.match(/\(/g) || []).length;
  console.log("Total amenity tuples:", amenityTuples);
}
