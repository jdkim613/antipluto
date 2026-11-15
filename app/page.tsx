import { Newsreader } from "next/font/google";

const newsreader = Newsreader({ subsets: ["latin"] });

export default function Home() {
  return (
    <div className={`${newsreader.className} flex min-h-svh flex-col bg-white p-6 text-neutral-900 selection:bg-neutral-200 sm:p-10`}>
      <main>
        <h1 className="text-lg leading-tight font-medium tracking-tight">antipluto</h1>
        <p className="mt-2 max-w-[44ch] text-base leading-7 text-pretty text-neutral-600">
          We build products that make everyday life a little better.
        </p>
      </main>
      <footer className="mt-auto pt-16 font-mono text-xs leading-5 text-neutral-500">
        Software design studio
      </footer>
    </div>
  );
}
