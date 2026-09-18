import { crc32 as nodeCrc32, deflateRawSync, inflateRawSync } from 'node:zlib';

// Sprint 08 / D-E: a minimal, dependency-free zip writer and reader for the
// release package. The writer emits deflate entries with the UTF-8 name flag;
// the reader parses the central directory (never trusting local headers for
// structure) and verifies each entry's CRC after inflation. Zip64 is out of
// scope: the package is far below the 4 GiB / 65535-entry limits, and the
// builder refuses to exceed them rather than emitting a broken archive.

const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const UTF8_FLAG = 0x0800;
const DEFLATE = 8;
const STORE = 0;

export class ZipError extends Error {}

// DOS date/time (2-second granularity, 1980 epoch). Values before 1980 clamp
// to the epoch, which is what other writers do rather than wrapping around.
export function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

// entries: [{ name, data (Buffer | string), mtime?: Date }] - a stable input
// order produces a byte-stable archive (deflate is deterministic for a fixed
// level and input).
export function buildZip(entries) {
  if (entries.length > 0xffff) throw new ZipError('Too many entries for a non-zip64 archive.');
  const parts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const deflated = deflateRawSync(data, { level: 9 });
    const crc = nodeCrc32(data) >>> 0;
    const { time, date } = dosDateTime(entry.mtime ?? new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIG, 0);
    local.writeUInt16LE(20, 4);        // version needed
    local.writeUInt16LE(UTF8_FLAG, 6); // names are UTF-8, flagged as such
    local.writeUInt16LE(DEFLATE, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);        // no extra field
    parts.push(local, name, deflated);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_SIG, 0);
    central.writeUInt16LE(20, 4);      // version made by
    central.writeUInt16LE(20, 6);      // version needed
    central.writeUInt16LE(UTF8_FLAG, 8);
    central.writeUInt16LE(DEFLATE, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);      // extra
    central.writeUInt16LE(0, 32);      // comment
    central.writeUInt16LE(0, 34);      // disk number
    central.writeUInt16LE(0, 36);      // internal attributes
    central.writeUInt32LE(0, 38);      // external attributes
    central.writeUInt32LE(offset, 42); // local header offset
    centralParts.push(central, name);
    offset += 30 + name.length + deflated.length;
  }
  const central = Buffer.concat(centralParts);
  if (offset + central.length + 22 > 0xffffffff) throw new ZipError('Archive exceeds the non-zip64 size limit.');
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(entries.length, 8);   // entries on this disk
  eocd.writeUInt16LE(entries.length, 10);  // entries total
  eocd.writeUInt32LE(central.length, 12);  // central directory size
  eocd.writeUInt32LE(offset, 16);          // central directory offset
  return Buffer.concat([...parts, central, eocd]);
}

// Reads an archive through its end-of-central-directory record and central
// directory; each returned entry carries the inflated, CRC-verified content.
export function parseZip(buffer) {
  const scannedFrom = Math.max(0, buffer.length - (22 + 0xffff));
  let eocd = -1;
  for (let i = buffer.length - 22; i >= scannedFrom; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd === -1) throw new ZipError('No end-of-central-directory record found.');
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let n = 0; n < count; n++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_SIG) {
      throw new ZipError(`Corrupt central directory at entry ${n}.`);
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const crc = buffer.readUInt32LE(offset + 16);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    offset += 46 + nameLength + extraLength + commentLength;

    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== LOCAL_SIG) {
      throw new ZipError(`Local header missing for entry ${name}.`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    const data = method === STORE ? Buffer.from(raw) : inflateRawSync(raw);
    if (data.length !== size || (nodeCrc32(data) >>> 0) !== crc) {
      throw new ZipError(`CRC or size mismatch for entry ${name}.`);
    }
    entries.push({ name, data, flags });
  }
  return entries;
}
