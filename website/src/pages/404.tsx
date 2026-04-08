import Link from "next/link";

export default function Custom404() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "4rem" }}>
      <h1>Page not found</h1>
      <p>The page you requested is not available.</p>
      <Link href="/">Return to PharmaConnect</Link>
    </main>
  );
}
