import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const assets = {
  ceramic_vase_02: "ceramic-vase-02",
  brass_vase_03: "brass-vase-03",
  brass_goblets: "brass-goblets",
  tea_set_01: "tea-set",
};

async function download(url, destination, md5) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (md5 && createHash("md5").update(buffer).digest("hex") !== md5) throw new Error(`Checksum invalid: ${destination}`);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, buffer);
}

for (const [asset, folder] of Object.entries(assets)) {
  const response = await fetch(`https://api.polyhaven.com/files/${asset}`);
  if (!response.ok) throw new Error(`Manifest invalid: ${asset}`);
  const manifest = await response.json();
  const entry = manifest.gltf?.["2k"]?.gltf;
  if (!entry) throw new Error(`glTF 2K indisponibil: ${asset}`);
  const root = join(process.cwd(), "public", "models", folder);
  const mainName = new URL(entry.url).pathname.split("/").pop();
  await download(entry.url, join(root, mainName), entry.md5);
  for (const [relative, file] of Object.entries(entry.include || {})) await download(file.url, join(root, relative), file.md5);
  const saved = await readFile(join(root, mainName));
  process.stdout.write(`${folder}: ${saved.length} bytes glTF\n`);
}
