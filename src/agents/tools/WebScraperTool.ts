import axios from 'axios';
import * as cheerio from 'cheerio';
import { Tool } from './Tool';

export const WebScraperTool: Tool = {
  name: 'web_scraper',
  description: 'Scrapes the text content of a given URL. Use this to get information from a webpage.',
  inputSchema: { url: 'string' },
  async execute(input: { url: string }): Promise<any> {
    try {
      const response = await axios.get(input.url);
      const $ = cheerio.load(response.data);
      // Remove script and style tags, then get text and clean it up.
      $('script, style').remove();
      const text = $('body').text().replace(/\s\s+/g, ' ').trim().substring(0, 2000);

      return { ok: true, content: text };
    } catch (error: any) {
      console.error('Error scraping website:', error);
      return { error: `Failed to scrape the URL: ${error.message}` };
    }
  },
};