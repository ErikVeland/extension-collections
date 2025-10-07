const bsdiff = require('bsdiff-node');
const fs = require('fs');
const path = require('path');

describe('bsdiff-node', () => {
  const tmpDir = path.join(__dirname, 'tmp_bsdiff');
  const fileA = path.join(tmpDir, 'a.bin');
  const fileB = path.join(tmpDir, 'b.bin');
  const patchFile = path.join(tmpDir, 'patch.diff');
  const patchedFile = path.join(tmpDir, 'patched.bin');

  beforeAll(() => {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    fs.writeFileSync(fileA, Buffer.from([1, 2, 3, 4, 5]));
    fs.writeFileSync(fileB, Buffer.from([1, 2, 99, 4, 5]));
  });

  afterAll(() => {
    [fileA, fileB, patchFile, patchedFile].forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    if (fs.existsSync(tmpDir)) fs.rmdirSync(tmpDir);
  });

  it('creates and applies a binary patch', async () => {
    await new Promise<void>((resolve, reject) => {
      try {
        bsdiff.diff(fileA, fileB, patchFile, (err) => {
          if (err) return reject(err);
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
    expect(fs.existsSync(patchFile)).toBe(true);
    await new Promise<void>((resolve, reject) => {
      try {
        bsdiff.patch(fileA, patchedFile, patchFile, (err) => {
          if (err) return reject(err);
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
    const orig = fs.readFileSync(fileB);
    const patched = fs.readFileSync(patchedFile);
    expect(patched.equals(orig)).toBe(true);
  });
});
