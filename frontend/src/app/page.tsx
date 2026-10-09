import Link from "next/link";

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center">
      <Link href="/forecast" className="rounded-xl bg-primary px-5 py-3 text-primary-fg">
        Open dashboard
      </Link>
    </main>
  );
}
