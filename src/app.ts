import { join } from 'path';
import { createWriteStream } from 'fs';
import { createCanvas, loadImage } from 'canvas';

import * as oglaf from './oglaf';

(async () => {
  try {
    const outputDir = join('.', 'output');

    const comics = await oglaf.getComics();
    for (let index = 0; index < comics.length; index++) {
      const comic = comics[index];
      const image = await loadImage(comic.path);

      const canvas = createCanvas(image.width, image.height + 120);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      ctx.font = '20px Impact';
      ctx.fillStyle = 'white';
      ctx.fillText(comic.title    || '', 10, image.height + 30);
      ctx.fillText(comic.subtitle || '', 10, image.height + 60);
      ctx.fillText(comic.alt      || '', 10, image.height + 90);

      const outputFile = join(outputDir, `${index} - ${comic.title}.jpg`);
      const outputFileStream = createWriteStream(outputFile);
      console.log(`Writing: ${outputFile}`);

      const jpgStream = canvas.createJPEGStream();
      jpgStream.pipe(outputFileStream);

      await new Promise((resolve, reject) => {
        outputFileStream.on('finish', resolve);
        outputFileStream.on('error', reject);
      });
    }
  } catch (e) {
    console.error(e.stack);
    process.exitCode = 1;
  }
})();
