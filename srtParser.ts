
import { SubtitleBlock } from '../types';

export const parseSRT = (content: string): SubtitleBlock[] => {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').trim();
  
  // Regex to match SRT blocks: index, timecode, then text until the next empty line
  const blocks: SubtitleBlock[] = [];
  const rawBlocks = normalized.split(/\n\n+/);

  for (const raw of rawBlocks) {
    const lines = raw.split('\n');
    if (lines.length >= 3) {
      const index = lines[0].trim();
      const timecode = lines[1].trim();
      const text = lines.slice(2).join('\n').trim();
      
      if (index && timecode && text) {
        blocks.push({ index, timecode, text });
      }
    }
  }
  
  return blocks;
};

export const stringifySRT = (blocks: SubtitleBlock[]): string => {
  return blocks
    .map(block => `${block.index}\n${block.timecode}\n${block.text}\n`)
    .join('\n');
};
