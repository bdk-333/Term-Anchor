/** Sentinel lane id for SQLite time projects & orphan tasks (no project = Others). */
export const OTHERS_LANE_ID = '__others__'

export function laneLabelForId(
  laneId: string,
  categories: ReadonlyArray<{ id: string; label: string }>,
): string {
  if (laneId === OTHERS_LANE_ID) return 'Others'
  return categories.find((c) => c.id === laneId)?.label ?? laneId
}
