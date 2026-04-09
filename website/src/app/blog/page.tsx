import BlogSearch from "@/components/BlogSearch";
import { ARTICLES } from "@/lib/data/articles";

export const metadata = {
  title: "Blog - PharmaConnect",
  description: "Regulatory, clinical, and technical notes from PharmaConnect.",
};

export default function BlogPage() {
  return (
    <main className="bg-mist py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-5xl font-semibold text-slate">Blog</h1>
        <p className="mt-5 max-w-3xl text-slate/70">
          Practical regulatory, clinical, and technical notes for pharmacy teams in
          Tanzania. Search and filtering are client-side to keep the page fast.
        </p>
        <div className="mt-10">
          <BlogSearch articles={ARTICLES} />
        </div>
      </div>
    </main>
  );
}
