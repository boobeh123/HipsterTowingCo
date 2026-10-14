const fs = require('fs');

// A WebP file's chunks and its pixel size, read from the RIFF headers (enough
// for the plain lossy WebP files under public/imgs/notes and public/imgs/learn)
module.exports = (file) => {
    const data = fs.readFileSync(file);
    expect(data.toString('ascii', 0, 4)).toBe('RIFF');
    expect(data.toString('ascii', 8, 12)).toBe('WEBP');
    const chunks = [];
    for (let offset = 12; offset < data.length;) {
        const size = data.readUInt32LE(offset + 4);
        chunks.push(data.toString('ascii', offset, offset + 4));
        offset += 8 + size + (size % 2);
    }
    expect(chunks[0]).toBe('VP8 ');
    return { chunks, width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
};
