import { readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { transform } from 'esbuild';

const OUTPUT_DIR = join(process.cwd(), '.mastra', 'output');
const SIZE_THRESHOLD_BYTES = 200 * 1024; // skip tiny files

async function minifyFile(filePath) {
  const relativePath = filePath.replace(`${OUTPUT_DIR}/`, '');

  try {
    const { size } = await stat(filePath);

    // if (size < SIZE_THRESHOLD_BYTES) {
    //   return;
    // }

    const source = await readFile(filePath, 'utf8');
    const result = await transform(source, {
      format: 'esm',
      minify: true,
      sourcefile: filePath,
    });

    await writeFile(filePath, result.code, 'utf8');

    const newSize = Buffer.byteLength(result.code, 'utf8');
    const formatSize = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)}MB`;

    console.log(
      `[mastra:minify] ${relativePath}: ${formatSize(size)} → ${formatSize(newSize)}`
    );
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`[mastra:minify] Skipping ${relativePath}, file not found.`);
      return;
    }

    console.error(`[mastra:minify] Failed to minify ${relativePath}:`, err);
    process.exitCode = 1;
  }
}

async function run() {
  const targets = await collectMjsFiles();

  if (targets.length === 0) {
    console.warn('[mastra:minify] No .mjs files found under .mastra/output');
    return;
  }

  await Promise.all(targets.map(minifyFile));
}

async function collectMjsFiles() {
  const files = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
          return;
        }

        if (entry.isFile() && entry.name.endsWith('.mjs')) {
          files.push(fullPath);
        }
      })
    );
  }

  await walk(OUTPUT_DIR);

  return files;
}

run();
