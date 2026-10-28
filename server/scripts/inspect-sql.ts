import { readFileSync } from "fs";

function inspect(path: string) {
  const buf = readFileSync(path);
  console.log(`File: ${path}`);
  console.log(`Length: ${buf.length} bytes`);
  console.log(`First 100 bytes (hex):`, buf.subarray(0, 100).toString('hex'));
  console.log(`First 100 bytes (utf8):`, JSON.stringify(buf.subarray(0, 100).toString('utf8')));
  const str = buf.toString('utf8');
  const lines = str.split(/\r?\n/);
  console.log(`Total lines: ${lines.length}`);
  console.log(`Line 1:`, JSON.stringify(lines[0]));
  console.log(`Line 2:`, JSON.stringify(lines[1]));
  console.log(`Line 3:`, JSON.stringify(lines[2]));
  console.log(`Has CRLF:`, buf.includes(Buffer.from('\r\n')));
  console.log(`Has LF only:`, buf.includes(Buffer.from('\n')) && !buf.includes(Buffer.from('\r\n')));
  console.log(`-----------------------------------`);
}

inspect("backups/reservation_mysql_dump.sql");
inspect("backups/clean_import.sql");
