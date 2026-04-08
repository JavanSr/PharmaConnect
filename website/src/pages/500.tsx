import Link from "next/link";

export default function Custom500() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "4rem" }}>
      <h1>Something went wrong</h1>
      <p>The PharmaConnect website could not load this page.</p>
      <Link href="/">Return to PharmaConnect</Link>
    </main>
  );
}
