import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Adopter, Dog, ProfileType } from '../types';
import { ADOPTER_QUESTIONS, DOG_QUESTIONS, combineAnswers } from '../types';
import {
  createAdopterProfile,
  createDogProfile,
  updateAdopterProfile,
  updateDogProfile,
} from '../lib/api/profiles';
import type { Answers, PhotoSlots } from '../lib/api/profiles';
import type { ActiveProfile } from '../lib/session';

type FormPhotoSlot = File | string | null;

interface CreateProfileProps {
  userId: string;
  profileType: ProfileType;
  existingProfile?: Dog | Adopter;
  onCreated: (profile: ActiveProfile, viewerText: string) => void;
}

function emptyAnswers(existingProfile?: Dog | Adopter): Answers {
  if (!existingProfile) return ['', '', '', '', ''];
  return [
    existingProfile.answer_1,
    existingProfile.answer_2,
    existingProfile.answer_3,
    existingProfile.answer_4,
    existingProfile.answer_5,
  ];
}

function emptyPhotos(existingProfile?: Dog | Adopter): [FormPhotoSlot, FormPhotoSlot, FormPhotoSlot, FormPhotoSlot] {
  if (!existingProfile) return [null, null, null, null];
  return [...existingProfile.photo_urls];
}

export function CreateProfile({ userId, profileType, existingProfile, onCreated }: CreateProfileProps) {
  const isEditing = !!existingProfile;
  const isDog = profileType === 'dog';
  const questions = isDog ? DOG_QUESTIONS : ADOPTER_QUESTIONS;
  const focusBorderClass = isDog ? 'focus:border-clay' : 'focus:border-sage';
  const submitButtonClass = isDog ? 'bg-clay hover:bg-clay-600' : 'bg-sage hover:bg-sage-600';

  const [name, setName] = useState(existingProfile?.name ?? '');
  const [breed, setBreed] = useState(existingProfile && 'breed' in existingProfile ? existingProfile.breed : '');
  const [age, setAge] = useState(existingProfile && 'age' in existingProfile ? existingProfile.age : '');
  const [answers, setAnswers] = useState<Answers>(emptyAnswers(existingProfile));
  const [photos, setPhotos] = useState(emptyPhotos(existingProfile));
  const [previews, setPreviews] = useState<[string | null, string | null, string | null, string | null]>(
    emptyPhotos(existingProfile).map((p) => (typeof p === 'string' ? p : null)) as [
      string | null,
      string | null,
      string | null,
      string | null,
    ]
  );
  const [missingPhotoIndexes, setMissingPhotoIndexes] = useState<number[]>([]);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handlePhotoChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotos((prev) => {
      const next = [...prev] as typeof prev;
      next[index] = file;
      return next;
    });
    setPreviews((prev) => {
      const next = [...prev] as typeof prev;
      next[index] = URL.createObjectURL(file);
      return next;
    });
    setMissingPhotoIndexes((prev) => prev.filter((i) => i !== index));
  }

  function handleAnswerChange(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev] as Answers;
      next[index] = value;
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const missing = photos.map((p, i) => (p === null ? i : null)).filter((i): i is number => i !== null);
    if (missing.length > 0) {
      setMissingPhotoIndexes(missing);
      return;
    }
    setMissingPhotoIndexes([]);

    if (answers.some((a) => a.trim() === '')) {
      setAnswerError('Please answer all questions before submitting.');
      return;
    }
    setAnswerError(null);

    const resolvedPhotos = photos as PhotoSlots;
    setSubmitting(true);

    if (profileType === 'dog') {
      const dog = isEditing
        ? await updateDogProfile({ id: existingProfile!.id, name, breed, age, answers, photos: resolvedPhotos })
        : await createDogProfile({
            user_id: userId,
            name,
            breed,
            age,
            answers,
            photos: resolvedPhotos as [File, File, File, File],
          });
      onCreated({ type: 'dog', id: dog.id }, combineAnswers(dog));
    } else {
      const adopter = isEditing
        ? await updateAdopterProfile({ id: existingProfile!.id, name, answers, photos: resolvedPhotos })
        : await createAdopterProfile({
            user_id: userId,
            name,
            answers,
            photos: resolvedPhotos as [File, File, File, File],
          });
      onCreated({ type: 'adopter', id: adopter.id }, combineAnswers(adopter));
    }
    setSubmitting(false);
  }

  const title = isEditing ? 'Edit profile' : isDog ? 'Create an intake profile' : 'Create your application';
  const subtitle = isEditing ? 'Update any field, then save.' : 'Four photos and five quick questions — take your time.';
  const submitLabel = submitting ? 'Submitting…' : isEditing ? 'Save changes' : "Enter Fetch'd";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12">
      <h1 className="mb-1 font-heading text-3xl">{title}</h1>
      <p className="mb-8 text-sm text-ink/70">{subtitle}</p>

      <div className="grid gap-8 md:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-ink/70">Name</label>
            <input
              aria-label="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isDog ? 'e.g. Biscuit' : 'e.g. Maya Chen'}
              className={`w-full min-h-10 rounded-full border border-divider bg-surface px-3.5 py-2 text-sm outline-none ${focusBorderClass}`}
            />
          </div>

          {isDog && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs text-ink/70">Breed</label>
                <input
                  aria-label="breed"
                  required
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Beagle mix"
                  className="w-full min-h-10 rounded-full border border-divider bg-surface px-3.5 py-2 text-sm outline-none focus:border-clay"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs text-ink/70">Age</label>
                <input
                  aria-label="age"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 3 years"
                  className="w-full min-h-10 rounded-full border border-divider bg-surface px-3.5 py-2 text-sm outline-none focus:border-clay"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs text-ink/70">4 photos required</label>
            <div className="grid grid-cols-2 gap-2.5">
              {previews.map((preview, i) => {
                const isMissing = missingPhotoIndexes.includes(i);
                return (
                  <label
                    key={i}
                    aria-label={`photo ${i + 1}`}
                    className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] border-dashed p-2 text-center ${
                      isMissing ? 'border-clay-700' : 'border-divider'
                    } ${preview ? 'bg-surface-2' : ''}`}
                  >
                    {preview ? (
                      <img src={preview} alt={`Photo ${i + 1}`} className="h-full w-full rounded-md object-cover" />
                    ) : isMissing ? (
                      <span className="font-mono text-[10px] text-clay-700">slot {i + 1} — required</span>
                    ) : (
                      <span className="font-mono text-[10px] text-ink/60">click to add photo {i + 1}</span>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoChange(i, e)} />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-3xl bg-surface p-6">
          {questions.map((question, i) =>
            question.input === 'text' ? (
              <div key={i}>
                <label className="mb-1.5 block text-xs text-ink/70">{question.label}</label>
                <input
                  aria-label={`answer ${i + 1}`}
                  value={answers[i]}
                  onChange={(e) => handleAnswerChange(i, e.target.value)}
                  placeholder={question.placeholder}
                  className={`min-h-10 w-full rounded-full border border-divider bg-surface-2 px-3.5 py-2 text-sm outline-none ${focusBorderClass}`}
                />
              </div>
            ) : (
              <div key={i}>
                <label className="mb-1.5 block text-xs text-ink/70">{question.label}</label>
                <textarea
                  aria-label={`answer ${i + 1}`}
                  value={answers[i]}
                  onChange={(e) => handleAnswerChange(i, e.target.value)}
                  placeholder={question.placeholder}
                  className={`min-h-17.5 w-full resize-y rounded-2xl border border-divider bg-surface-2 px-3.5 py-2.5 text-sm outline-none ${focusBorderClass}`}
                />
              </div>
            )
          )}
          {answerError && <p className="text-xs text-clay-700">{answerError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className={`self-start rounded-full px-7 py-3 font-heading text-[15px] text-cream transition-colors disabled:opacity-60 ${submitButtonClass}`}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}
