import { useState } from 'react';
import type { Dog } from '../types';
import { DOG_QUESTIONS } from '../types';

interface DogCardProps {
  dog: Dog;
}

export function DogCard({ dog }: DogCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  return (
    <div className="flex flex-col overflow-hidden rounded-[calc(var(--radius-lg)*1.15)] bg-surface shadow-lg md:grid md:h-140 md:grid-cols-[380px_1fr]">
      <div className="relative h-72 overflow-hidden md:h-full">
        <div className="absolute left-3.5 right-3.5 top-3.5 z-10 flex gap-1.25">
          {dog.photo_urls.map((_, i) => (
            <div key={i} className={`h-0.75 flex-1 rounded-full ${i === photoIndex ? 'bg-white' : 'bg-white/38'}`} />
          ))}
        </div>
        <img src={dog.photo_urls[photoIndex]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => setPhotoIndex((i) => (i + 3) % 4)}
          className="absolute left-0 top-0 z-[5] h-full w-1/2 cursor-pointer border-none bg-transparent"
        />
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => setPhotoIndex((i) => (i + 1) % 4)}
          className="absolute right-0 top-0 z-[5] h-full w-1/2 cursor-pointer border-none bg-transparent"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex h-[42%] flex-col justify-end bg-linear-to-t from-stone-900/80 to-transparent p-5">
          <div className="font-heading text-3xl leading-tight text-white">{dog.name}</div>
          <div className="mt-0.5 text-sm text-white/82">
            {dog.breed} · {dog.age}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col px-5 py-5 md:h-full md:px-6.5 md:pb-5.5 md:pt-19.5">
        <div className="flex flex-1 flex-col gap-3.5 md:overflow-y-auto md:pr-1">
          {DOG_QUESTIONS.map((question, i) => (
            <div key={question.label}>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-clay-700">{question.label}</div>
              <div className="text-sm leading-relaxed">{dog[`answer_${i + 1}` as keyof Dog] as string}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
