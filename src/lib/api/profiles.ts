import { supabase } from '../../supabaseClient';
import type { Adopter, Dog, IntakeFields, ProfileType } from '../../types';

export type Answers = [string, string, string, string, string];
export type PhotoSlot = File | string;
export type PhotoSlots = [PhotoSlot, PhotoSlot, PhotoSlot, PhotoSlot];

export interface CreateDogInput {
  user_id: string;
  name: string;
  breed: string;
  age: string;
  answers: Answers;
  photos: [File, File, File, File];
  intake?: IntakeFields;
}

export interface CreateAdopterInput {
  user_id: string;
  name: string;
  answers: Answers;
  photos: [File, File, File, File];
}

export interface UpdateDogInput {
  id: string;
  name: string;
  breed: string;
  age: string;
  answers: Answers;
  photos: PhotoSlots;
  intake?: IntakeFields;
}

export interface UpdateAdopterInput {
  id: string;
  name: string;
  answers: Answers;
  photos: PhotoSlots;
}

async function uploadPhoto(photo: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${photo.name}`;
  const { error } = await supabase.storage.from('photos').upload(path, photo);
  if (error) throw error;
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

async function uploadPhotos(photos: [File, File, File, File]): Promise<[string, string, string, string]> {
  const urls = await Promise.all(photos.map(uploadPhoto));
  return urls as [string, string, string, string];
}

async function resolvePhotoSlots(photos: PhotoSlots): Promise<[string, string, string, string]> {
  const urls = await Promise.all(photos.map((slot) => (typeof slot === 'string' ? slot : uploadPhoto(slot))));
  return urls as [string, string, string, string];
}

function answersToColumns(answers: Answers) {
  const [answer_1, answer_2, answer_3, answer_4, answer_5] = answers;
  return { answer_1, answer_2, answer_3, answer_4, answer_5 };
}

function intakeToColumns(intake?: IntakeFields) {
  return intake ?? {};
}

export async function createDogProfile(input: CreateDogInput): Promise<Dog> {
  const photo_urls = await uploadPhotos(input.photos);
  const { data, error } = await supabase
    .from('dogs')
    .insert({
      user_id: input.user_id,
      name: input.name,
      breed: input.breed,
      age: input.age,
      photo_urls,
      ...answersToColumns(input.answers),
      ...intakeToColumns(input.intake),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Dog;
}

export async function createAdopterProfile(input: CreateAdopterInput): Promise<Adopter> {
  const photo_urls = await uploadPhotos(input.photos);
  const { data, error } = await supabase
    .from('adopters')
    .insert({
      user_id: input.user_id,
      name: input.name,
      photo_urls,
      ...answersToColumns(input.answers),
    })
    .select()
    .single();
  if (error) throw error;
  return data as Adopter;
}

export async function updateDogProfile(input: UpdateDogInput): Promise<Dog> {
  const photo_urls = await resolvePhotoSlots(input.photos);
  const { data, error } = await supabase
    .from('dogs')
    .update({
      name: input.name,
      breed: input.breed,
      age: input.age,
      photo_urls,
      ...answersToColumns(input.answers),
      ...intakeToColumns(input.intake),
    })
    .eq('id', input.id)
    .select()
    .single();
  if (error) throw error;
  return data as Dog;
}

export async function updateAdopterProfile(input: UpdateAdopterInput): Promise<Adopter> {
  const photo_urls = await resolvePhotoSlots(input.photos);
  const { data, error } = await supabase
    .from('adopters')
    .update({
      name: input.name,
      photo_urls,
      ...answersToColumns(input.answers),
    })
    .eq('id', input.id)
    .select()
    .single();
  if (error) throw error;
  return data as Adopter;
}

export async function fetchDogProfile(id: string): Promise<Dog> {
  const { data, error } = await supabase.from('dogs').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Dog;
}

export async function fetchAdopterProfile(id: string): Promise<Adopter> {
  const { data, error } = await supabase.from('adopters').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Adopter;
}

export async function fetchProfile(type: ProfileType, id: string): Promise<Dog | Adopter> {
  return type === 'dog' ? fetchDogProfile(id) : fetchAdopterProfile(id);
}

export interface OwnedProfile {
  type: ProfileType;
  id: string;
}

export async function fetchOwnedProfiles(userId: string): Promise<OwnedProfile[]> {
  const [dogsResult, adoptersResult] = await Promise.all([
    supabase.from('dogs').select('id').eq('user_id', userId),
    supabase.from('adopters').select('id').eq('user_id', userId),
  ]);

  if (dogsResult.error) throw dogsResult.error;
  if (adoptersResult.error) throw adoptersResult.error;

  const dogProfiles: OwnedProfile[] = (dogsResult.data ?? []).map((row: { id: string }) => ({
    type: 'dog',
    id: row.id,
  }));

  const adopterProfiles: OwnedProfile[] = (adoptersResult.data ?? []).map((row: { id: string }) => ({
    type: 'adopter',
    id: row.id,
  }));
  return [...dogProfiles, ...adopterProfiles];
}
