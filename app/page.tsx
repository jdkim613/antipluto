import HalftoneCanvas from "./HalftoneCanvas";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-white">
      <HalftoneCanvas />
      <p className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-sm tracking-tight text-neutral-500">
        coming soon
      </p>
    </main>
  );
}
