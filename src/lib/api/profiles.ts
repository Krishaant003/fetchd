import { supabase } from '../../supabaseClient';
import { Adopter, Dog, ProfileType } from '../../types';

export interface CreateDogInput {
  session_id: string;
  name: string;
  breed: string;
  age: string;
  story: string;
  photo: File;
}

export interface CreateAdopterInput {
  session_id: string;
  name: string;
  lifestyle_text: string;
  photo: File;
}

async function uploadPhoto(photo: File): Promise<string> {
  const path = `${crypto.randomUUID()}-${photo.name}`;
  const { error } = await supabase.storage.from('photos').upload(path, photo);
  if (error) throw error;
  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function createDogProfile(input: CreateDogInput): Promise<Dog> {
  const photo_url = await uploadPhoto(input.photo);
  const { data, error } = await supabase
    .from('dogs')
    .insert({
      session_id: input.session_id,
      name: input.name,
      breed: input.breed,
      age: input.age,
      story: input.story,
      photo_url,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Dog;
}

export async function createAdopterProfile(input: CreateAdopterInput): Promise<Adopter> {
  const photo_url = await uploadPhoto(input.photo);
  const { data, error } = await supabase
    .from('adopters')
    .insert({
      session_id: input.session_id,
      name: input.name,
      lifestyle_text: input.lifestyle_text,
      photo_url,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Adopter;
}

export async function fetchProfileText(type: ProfileType, id: string): Promise<string> {
  if (type === 'dog') {
    const { data, error } = await supabase.from('dogs').select('story').eq('id', id).single();
    if (error) throw error;
    return data.story;
  }
  const { data, error } = await supabase.from('adopters').select('lifestyle_text').eq('id', id).single();
  if (error) throw error;
  return data.lifestyle_text;
}
