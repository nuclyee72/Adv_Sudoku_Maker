/**
 * dedupStructures.js — 여러 9x9 판이 겹칠 때 공유되는 구조체(줄/박스/전체테두리)를
 * 중복 없이 하나로 합친다.
 */
export function dedupStructures(structuresList) {
  const structMap = new Map();
  structuresList.forEach(s => {
    const coordsKey = s.coords.map(c => `${c.row},${c.col}`).join('|');
    const key = `${s.type}-${s.originRow}-${s.originCol}-${coordsKey}`;
    if (!structMap.has(key)) structMap.set(key, s);
  });
  return Array.from(structMap.values());
}
