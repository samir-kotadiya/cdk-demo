export const ALL_STAGES = ['live', 'pre', 'dev'] as const;
export type Stage = (typeof ALL_STAGES)[number];

export const isLiveStage = (): boolean =>
  (process.env?.STAGE?.toLowerCase() ?? 'local') === 'live';
