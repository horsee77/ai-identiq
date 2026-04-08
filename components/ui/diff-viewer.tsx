export function DiffViewer({
  previous,
  current,
}: {
  previous: string;
  current: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-500">Versão anterior</h4>
        <pre className="max-h-80 overflow-auto text-xs text-zinc-700">{previous}</pre>
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase text-zinc-500">Versão atual</h4>
        <pre className="max-h-80 overflow-auto text-xs text-zinc-900">{current}</pre>
      </section>
    </div>
  );
}

