export function JsonViewer({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
