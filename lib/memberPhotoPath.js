import { MIME_TO_EXT } from './allowedImageTypes'

// Deterministic storage path shared between the upload-url and confirm steps
// of the member-photos upload flow. Never trust a path supplied by the
// client — always recompute it server-side from the authenticated user id
// + kind/carIndex so one member can't overwrite another's photo.
export const EXT_BY_MIME = MIME_TO_EXT

export function memberPhotoPath(userId, kind, carIndex, ext) {
  return kind === 'avatar'
    ? `${userId}-avatar.${ext}`
    : (carIndex !== null && carIndex > 0 ? `${userId}-car-${carIndex}.${ext}` : `${userId}.${ext}`)
}
