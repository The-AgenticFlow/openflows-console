// PageHeader: shared, consistent title + optional description block used at the
// top of every page to keep headings uniform.
export function PageHeader({
  title,
  description,
}: Readonly<{ title: string; description?: string }>) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
    </div>
  );
}
