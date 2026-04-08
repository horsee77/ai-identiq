export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
      <h4 className="text-sm font-semibold text-zinc-800">{title}</h4>
      <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">{description}</p>
    </div>
  );
}
