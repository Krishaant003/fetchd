import type { Adopter } from '../types';

interface AdopterCardProps {
  adopter: Adopter;
  note?: string;
  noteLoading: boolean;
}

export function AdopterCard({ adopter, note, noteLoading }: AdopterCardProps) {
  return (
    <div className="relative rotate-[1deg] rounded-sm border-2 border-slate-700 bg-[repeating-linear-gradient(white,white_27px,#cbd5e1_28px)] p-4 shadow-lg font-mono">
      <div className="absolute -top-3 left-4 rounded bg-slate-700 px-2 py-0.5 text-xs uppercase tracking-widest text-white">
        Applicant
      </div>
      <img
        src={adopter.photo_url}
        alt={adopter.name}
        className="mb-3 h-56 w-full rounded-sm border border-slate-700 object-cover"
      />
      <h2 className="text-xl font-bold uppercase text-slate-900">{adopter.name}</h2>
      <p className="mt-2 text-sm text-slate-900">{adopter.lifestyle_text}</p>
      {(note || noteLoading) && (
        <div className="absolute -right-4 -top-4 w-48 rotate-[-4deg] border border-dashed border-yellow-700 bg-yellow-100 p-2 text-xs text-yellow-900 shadow-md">
          <p className="mb-1 font-bold uppercase">Note</p>
          {noteLoading ? <p>thinking…</p> : <p>{note}</p>}
        </div>
      )}
    </div>
  );
}
