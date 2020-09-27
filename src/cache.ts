import { join } from 'path';
import { Stream } from 'stream';
import { promises as fs, createWriteStream } from 'fs';

const encoding = 'utf8';
const createFilePath = (key: string) => join('.', 'cache', key);

export async function get(key: string): Promise<string|undefined> {
  try {
    const path = createFilePath(key);
    return await fs.readFile(path, encoding);
  } catch (error) {
    return undefined;
  }
}

export async function getBinaryPath(key: string): Promise<string|undefined> {
  try {
    const path = createFilePath(key);
    await fs.stat(path); // stat will throw on "ENOENT"
    return path;
  } catch (error) {
    return undefined;
  }
}

export async function put(key: string, data: string): Promise<void> {
  const path = createFilePath(key);
  await fs.writeFile(path, data, encoding);
}

export async function putBinary(key: string, data: Stream): Promise<string> {
  const path = createFilePath(key);
  const fileStream = createWriteStream(path);

  data.pipe(fileStream);

  return new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  })
  .then(() => path);
}
