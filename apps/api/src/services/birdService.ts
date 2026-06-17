import {
  normalizeRing,
  normalizeMicrochip,
  type CreateBirdInput,
  type UpdateBirdInput,
} from '@homeward/shared';
import { BirdProfile, type BirdProfileDocument } from '../models/BirdProfile.js';
import type { UserDocument } from '../models/User.js';

function buildLegRing(input: NonNullable<CreateBirdInput['legRing']>) {
  return {
    number: input.number,
    normalized: normalizeRing(input.number),
    breederCode: input.breederCode,
    year: input.year,
  };
}

// Create a passport. Registering a bird is what makes a user an `owner`
// (spec §6) — grant the role here, resolving the @owner chicken-and-egg.
export async function createBird(
  owner: UserDocument,
  input: CreateBirdInput,
): Promise<BirdProfileDocument> {
  const bird = await BirdProfile.create({
    ownerId: owner._id,
    name: input.name,
    category: 'bird',
    species: input.species,
    morphColor: input.morphColor,
    legRing: input.legRing ? buildLegRing(input.legRing) : undefined,
    microchipId: input.microchipId ? normalizeMicrochip(input.microchipId) : undefined,
    photos: input.photos,
    distinguishingMarks: input.distinguishingMarks,
    soundsWords: input.soundsWords,
    temperament: input.temperament,
    status: input.status,
  });

  if (!owner.roles.includes('owner')) {
    owner.roles.push('owner');
    await owner.save();
  }
  return bird;
}

export function getBirdById(id: string): Promise<BirdProfileDocument | null> {
  return BirdProfile.findById(id);
}

export function listBirdsByOwner(ownerId: string): Promise<BirdProfileDocument[]> {
  return BirdProfile.find({ ownerId }).sort({ createdAt: -1 });
}

export async function updateBird(
  bird: BirdProfileDocument,
  input: UpdateBirdInput,
): Promise<BirdProfileDocument> {
  if (input.name !== undefined) bird.name = input.name;
  if (input.species !== undefined) bird.species = input.species;
  if (input.morphColor !== undefined) bird.morphColor = input.morphColor;
  if (input.distinguishingMarks !== undefined) bird.distinguishingMarks = input.distinguishingMarks;
  if (input.temperament !== undefined) bird.temperament = input.temperament;
  if (input.status !== undefined) bird.status = input.status;
  if (input.photos !== undefined) bird.set('photos', input.photos);
  if (input.soundsWords !== undefined) bird.set('soundsWords', input.soundsWords);
  if (input.legRing !== undefined) bird.set('legRing', buildLegRing(input.legRing));
  if (input.microchipId !== undefined) bird.microchipId = normalizeMicrochip(input.microchipId);
  await bird.save();
  return bird;
}

// Ring-first lookup (spec §8A / §9). Normalizes the query the same way as storage.
export function lookupByRing(rawRing: string): Promise<BirdProfileDocument | null> {
  const normalized = normalizeRing(rawRing);
  if (!normalized) return Promise.resolve(null);
  return BirdProfile.findOne({ 'legRing.normalized': normalized });
}
