import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProfileType } from '../types';
import { createDogProfile, createAdopterProfile } from '../lib/api/profiles';
import type { ActiveProfile } from '../lib/session';

interface CreateProfileProps {
  sessionId: string;
  profileType: ProfileType;
  onCreated: (profile: ActiveProfile, viewerText: string) => void;
}

export function CreateProfile({ sessionId, profileType, onCreated }: CreateProfileProps) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [story, setStory] = useState('');
  const [lifestyleText, setLifestyleText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!photo) return;
    setSubmitting(true);
    if (profileType === 'dog') {
      const dog = await createDogProfile({ session_id: sessionId, name, breed, age, story, photo });
      onCreated({ type: 'dog', id: dog.id }, dog.story);
    } else {
      const adopter = await createAdopterProfile({ session_id: sessionId, name, lifestyle_text: lifestyleText, photo });
      onCreated({ type: 'adopter', id: adopter.id }, adopter.lifestyle_text);
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-3 border-2 border-amber-900 bg-amber-50 p-6 font-mono">
      <h2 className="text-lg font-bold uppercase">
        {profileType === 'dog' ? 'Dog Intake Form' : 'Adopter Application'}
      </h2>
      <input aria-label="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="w-full border p-2" />
      {profileType === 'dog' ? (
        <>
          <input aria-label="breed" required value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="Breed" className="w-full border p-2" />
          <input aria-label="age" required value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" className="w-full border p-2" />
          <textarea aria-label="story" required value={story} onChange={(e) => setStory(e.target.value)} placeholder="Story" className="w-full border p-2" />
        </>
      ) : (
        <textarea aria-label="lifestyle" required value={lifestyleText} onChange={(e) => setLifestyleText(e.target.value)} placeholder="Tell us about your lifestyle" className="w-full border p-2" />
      )}
      <input aria-label="photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="w-full" />
      <button type="submit" disabled={submitting} className="w-full border-2 border-amber-900 bg-amber-900 py-2 text-amber-50">
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
