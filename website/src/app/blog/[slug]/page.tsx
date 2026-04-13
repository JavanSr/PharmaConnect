import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ARTICLES } from "@/lib/data/articles";

interface BlogArticlePageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: BlogArticlePageProps) {
  const article = ARTICLES.find((item) => item.slug === params.slug);
  return {
    title: article ? `${article.title} - PharmaConnect` : "Article - PharmaConnect",
    description: article?.excerpt ?? "PharmaConnect article.",
  };
}

export default function BlogArticlePage({ params }: BlogArticlePageProps) {
  const article = ARTICLES.find((item) => item.slug === params.slug);
  if (!article) {
    notFound();
  }
  const related = ARTICLES.filter((item) => item.slug !== article.slug).slice(0, 3);

  return (
    <main className="bg-white py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <article>
          <Badge variant={article.isSponsored ? "sponsored" : "primary"}>{article.category}</Badge>
          <h1 className="mt-5 font-serif text-5xl font-semibold text-slate">{article.title}</h1>
          <p className="mt-4 text-sm text-slate/50">
            {article.date} - {article.readingTime} min read - {article.author}
          </p>
          <div className="mt-10 grid gap-6 text-lg leading-9 text-slate/75">
            {article.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-8">
            <Button href={`mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(`https://pharmaconnect.tz/blog/${article.slug}`)}`} variant="outline">
              Share this article
            </Button>
          </div>
        </article>
        <aside className="rounded-lg bg-mist p-6">
          <h2 className="text-lg font-semibold text-slate">Related articles</h2>
          <div className="mt-5 grid gap-4">
            {related.map((item) => (
              <Link className="rounded-lg bg-white p-4 text-sm font-semibold text-slate" href={`/blog/${item.slug}`} key={item.slug}>
                {item.title}
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
