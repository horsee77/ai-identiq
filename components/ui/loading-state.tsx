export function LoadingState({ label = "Carregando dados..." }: { label?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8">
      <div className="flex items-center gap-3">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-r-transparent" />
        <p className="text-sm text-zinc-600">{label}</p>
      </div>
    </div>
  );
}
