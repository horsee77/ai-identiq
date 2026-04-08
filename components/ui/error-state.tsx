export function ErrorState({
  title = "Não foi possível carregar as informações.",
  description = "Tente novamente em alguns instantes.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h4 className="text-sm font-semibold text-red-700">{title}</h4>
      <p className="mt-1 text-sm text-red-600">{description}</p>
    </div>
  );
}

