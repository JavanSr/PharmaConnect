"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { Article } from "@/lib/data/articles";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

interface BlogSearchProps {
  articles: Article[];
}

const categories = ["All", "Regulatory", "Clinical", "Technical", "Opinion", "Compliance"] as const;

export default function BlogSearch({ articles }: BlogSearchProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const visibleArticles = useMemo(
    () =>
      articles.filter(
        (article) =>
          (!activeCategory || article.category === activeCategory) &&
          (!query ||
            article.title.toLowerCase().includes(query.toLowerCase()) ||
            article.excerpt.toLowerCase().includes(query.toLowerCase())),
      ),
    [activeCategory, articles, query],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const active = category === "All" ? activeCategory === null : activeCategory === category;
          return (
            <button
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-medium transition",
                active
                  ? "border-primary bg-primary text-white"
                  : "border-slate/10 bg-primary-lightest text-slate/50 hover:text-primary",
              )}
              key={category}
              onClick={() => setActiveCategory(category === "All" ? null : category)}
              type="button"
            >
              {category}
            </button>
          );
        })}
      </div>

      <label className="relative mt-6 block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate/40" size={16} />
        <input
          className="min-h-11 w-full rounded-lg border border-slate/20 bg-white pl-11 pr-4 text-slate outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles"
          type="text"
          value={query}
        />
      </label>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleArticles.map((article) => (
          <article className="rounded-xl border border-slate/10 bg-white p-6" key={article.slug}>
            <Badge variant={article.isSponsored ? "sponsored" : "primary"}>
              {article.isSponsored ? "SPONSORED" : article.category}
            </Badge>
            <h2 className="mt-4 line-clamp-2 text-base font-medium text-slate">{article.title}</h2>
            <p className="mt-3 line-clamp-2 text-sm text-slate/65">{article.excerpt}</p>
            <p className="mt-4 text-xs text-slate/40">
              {article.date} · {article.readingTime} min read
            </p>
            <Link className="mt-4 inline-flex text-sm font-medium text-primary" href={`/blog/${article.slug}`}>
              Read →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
