export default function CharacterLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading character build"
      className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 animate-pulse rounded-md bg-app-raised motion-reduce:animate-none" />
        <div className="grid gap-2">
          <div className="h-6 w-40 animate-pulse rounded-sm bg-app-raised motion-reduce:animate-none" />
          <div className="h-4 w-28 animate-pulse rounded-sm bg-app-surface motion-reduce:animate-none" />
        </div>
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="h-20 animate-pulse rounded-md border border-app-border/70 bg-app-surface motion-reduce:animate-none"
            key={index}
          />
        ))}
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            className="h-80 animate-pulse rounded-md border border-app-border/70 bg-app-surface motion-reduce:animate-none"
            key={index}
          />
        ))}
      </div>
    </main>
  );
}
