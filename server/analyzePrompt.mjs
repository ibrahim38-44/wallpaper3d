/**
 * AI oda analizi için sistem istemi ve yapılandırılmış çıktı (tool) şeması.
 * İstemci sözleşmesi: src/ai/types.ts
 */

export const SYSTEM_PROMPT = `You are an interior-survey assistant for a wallpaper retailer's 3D room planner.
You receive one or more photos (or video frames) of a single room plus a catalog of 3D furniture types.
Your job: identify the furniture and architectural openings visible in the room, map each to the closest catalog id,
and estimate its approximate size and position so the planner can pre-populate a 3D model that the user will then correct manually.

COORDINATE CONVENTION (very important):
- The wall directly facing the camera in the FIRST image is the "back" wall. "left"/"right" are as seen in the first image; "front" is behind the camera.
- x: 0.0 = left wall, 1.0 = right wall. z: 0.0 = back wall, 1.0 = front wall. Values refer to the CENTER of the object's floor footprint.
- For doors/windows/balcony doors (placement "opening"): give "wall" and "alongWall" = horizontal center of the opening on that wall,
  0.0 = left edge and 1.0 = right edge of that wall when standing inside the room facing that wall. Also give elevationCm (bottom edge above floor).
- For objects standing against a wall, set "wall" to that wall. For free-standing objects set "wall" to null and give rotationDeg
  of the object's FRONT side: 0 = faces the front wall (towards the camera), 90 = faces the right wall, 180 = faces the back wall, 270 = faces the left wall.
- sizeCm: w = width across the object's front, d = depth front-to-back, h = height, all in centimetres.

RULES:
- Only use catalog ids that are provided. If nothing fits, skip the object.
- Use the provided room dimensions as the scale reference; use standard furniture sizes and visible references (door ≈ 200–210 cm high, counter ≈ 90 cm) to estimate sizes.
- Merge duplicates seen across multiple images/frames into ONE item.
- confidence in [0,1] reflects how sure you are about type AND approximate position.
- Never invent objects that are not visible. Prefer fewer, correct items.
- If asked to estimate the room, give interior width (left→right), length (back→front) and ceiling height in cm.
- Always answer by calling the report_room_analysis tool. Write summary and warnings in Turkish.`;

export function buildToolSchema(catalogIds) {
  return {
    name: 'report_room_analysis',
    description: 'Report detected furniture/openings and optional room size estimate.',
    input_schema: {
      type: 'object',
      properties: {
        roomEstimate: {
          type: ['object', 'null'],
          properties: {
            widthCm: { type: 'number' },
            lengthCm: { type: 'number' },
            heightCm: { type: 'number' },
            confidence: { type: 'number' },
          },
          required: ['widthCm', 'lengthCm', 'heightCm', 'confidence'],
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              catalogId: { type: 'string', enum: catalogIds },
              label: { type: 'string', description: 'Short Turkish label, e.g. "Gri köşe koltuk"' },
              confidence: { type: 'number' },
              wall: { type: ['string', 'null'], enum: ['back', 'right', 'front', 'left', null] },
              x: { type: 'number' },
              z: { type: 'number' },
              alongWall: { type: 'number' },
              elevationCm: { type: 'number' },
              sizeCm: {
                type: 'object',
                properties: { w: { type: 'number' }, d: { type: 'number' }, h: { type: 'number' } },
                required: ['w', 'd', 'h'],
              },
              rotationDeg: { type: 'number' },
              notes: { type: 'string' },
            },
            required: ['catalogId', 'label', 'confidence', 'wall', 'x', 'z'],
          },
        },
        summary: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } },
      },
      required: ['items', 'summary'],
    },
  };
}

export function buildUserText({ room, estimateRoom, catalog, notes }) {
  const lines = catalog.map(
    (c) => `- ${c.id} [${c.placement}] ${c.hint} (typical ${c.defaultSize.w}×${c.defaultSize.d}×${c.defaultSize.h} cm)`,
  );
  return [
    `Room (user-entered interior size): width ${room.widthCm} cm (left→right), length ${room.lengthCm} cm (back→front), ceiling ${room.heightCm} cm.`,
    estimateRoom
      ? 'The user is NOT sure about these dimensions: also estimate the room size from the images (roomEstimate).'
      : 'Treat these dimensions as correct; set roomEstimate to null.',
    notes ? `User notes: ${notes}` : '',
    'Catalog (id [placement] description):',
    ...lines,
    'Analyse the images and call report_room_analysis.',
  ]
    .filter(Boolean)
    .join('\n');
}
