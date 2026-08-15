import { Dog } from '../types';

interface DogCardProps {
  dog: Dog;
  note?: string;
  noteLoading: boolean;
}

export function DogCard({ dog, note, noteLoading }: DogCardProps) {
  return (
    <div className="relative rotate-[-1deg] rounded-sm border-2 border-amber-900 bg-amber-50 p-4 shadow-lg font-mono">
      <div className="absolute -top-3 left-4 rounded bg-amber-900 px-2 py-0.5 text-xs uppercase tracking-widest text-amber-50">
        Intake Card
      </div>
      <img
        src={dog.photo_url}
        alt={dog.name}
        className="mb-3 h-56 w-full rounded-sm border border-amber-900 object-cover"
      />
      <h2 className="text-xl font-bold uppercase text-amber-950">{dog.name}</h2>
      <p className="text-sm text-amber-900">{dog.breed} — {dog.age}</p>
      <p className="mt-2 text-sm text-amber-950">{dog.story}</p>
      {(note || noteLoading) && (
        <div className="absolute -right-4 -top-4 w-48 rotate-[4deg] border border-dashed border-yellow-700 bg-yellow-100 p-2 text-xs text-yellow-900 shadow-md">
          <p className="mb-1 font-bold uppercase">Note</p>
          {noteLoading ? <p>thinking…</p> : <p>{note}</p>}
        </div>
      )}
    </div>
  );
}
