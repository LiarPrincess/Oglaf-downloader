import { default as axios } from 'axios';
import { load as cheerio } from 'cheerio';

import * as cache from './cache';

const baseUrl = 'https://www.oglaf.com';

export interface Comic {

  /** Page title */
  readonly title: string;

  /** Image title */
  readonly subtitle: string;

  /** Image alt */
  readonly alt: string;

  /** Image path on disc */
  readonly path: string;
}

/** Get all of the Oglaf comics */
export async function getComics(): Promise<Comic[]> {
  const result: Comic[] = [];
  const comicUrls = await cacheComics();

  for (const comicUrl of comicUrls) {
    const html = await getHtml(comicUrl);

    const $ = cheerio(html);
    const image = parseComicImageUrl($);
    const imagePath = await getImage(image.src);

    result.push({
      title: parseComicTitle($),
      subtitle: image.title,
      alt: image.alt,
      path: imagePath,
    });
  }
  return result;
}

async function cacheComics(): Promise<string[]> {
  const result: string[] = [];

  let currentUrl: string | undefined = baseUrl;
  while (currentUrl) {
    result.push(currentUrl);

    const html = await getHtml(currentUrl);
    const $ = cheerio(html);
    currentUrl = parsePreviousComicPath($);
  }

  const comicUrlsChronologically = result.reverse();
  return comicUrlsChronologically;
}

async function getHtml(url: string): Promise<string> {
  const cacheKey = url.replace(/[\/:]/g, '');
  const cachedResponse = await cache.get(cacheKey);

  if (cachedResponse) {
    console.log(`Found cached response for: '${url}'`);
    return cachedResponse;
  }

  console.log(`Downloading: '${url}'`);
  const response = await axios.get(url);
  const html = response.data;
  await cache.put(cacheKey, html);
  return html;
}

async function getImage(url: string): Promise<string> {
  const key = url.replace(/[\/:]/g, '');
  const cachedResponse = await cache.getBinaryPath(key);

  if (cachedResponse) {
    console.log(`Found cached response for: '${url}'`);
    return cachedResponse;
  }

  console.log(`Downloading: '${url}'`);
  const response = await axios.get(url, { responseType: 'stream' });
  const path = await cache.putBinary(key, response.data);
  return path;
}

/// Look for: <a href="/touch-fear/" rel="prev" class="button previous" accesskey="k">Previous</a>
function parsePreviousComicPath($: CheerioSelector): string | undefined {
  const previousButtonNodes = $('.previous');
  if (previousButtonNodes.length !== 1) {
    throw new Error(`Error when looking for previous button on: '${parseComicTitle($)}'`);
  }

  const previousButton = previousButtonNodes[0];
  const previousSubPath = previousButton.attribs.href;

  return previousSubPath ?
    baseUrl + previousButton.attribs.href :
    undefined;
}

interface Image {
  readonly title: string;
  readonly src: string;
  readonly alt: string;
}

/// Look for: <img id="strip" src="https://media.oglaf.com/comic/crimp.jpg" alt="it's the parasite that drinks your time" title="If the gods were less insecure they'd let us be better. Say nice things about gods.">
function parseComicImageUrl($: CheerioSelector): Image {
  const imageNodes = $('#strip');
  if (imageNodes.length !== 1) {
    throw new Error(`Error when looking for comic image on: '${parseComicTitle($)}'`);
  }

  const image = imageNodes[0];
  const imageAttribs = image.attribs;
  return {
    title: imageAttribs.title,
    src: imageAttribs.src,
    alt: imageAttribs.alt,
  };
}

function parseComicTitle($: CheerioSelector): string {
  return $('title').text();
}
