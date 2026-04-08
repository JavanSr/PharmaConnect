"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import type { Article } from "@/lib/data/articles";

interface BlogSearchProps {
  articles: Article[];
}

export default function BlogSearch({ articles }: BlogSearchProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = ["All", ...Array.from(new Set(articles.map((article) => article.category)))];
  const visibleArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return articles.filter((article) => {
      const categoryMatches = category === "All" || article.category === category;
      const queryMatches =
        !q ||
        `${article.title} ${article.excerpt} ${article.category}`.toLowerCase().includes(q);
      return categoryMatches && queryMatches;
    });
  }, [articles, category, query]);

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row">
        <input
          className="min-h-11 flex-1 rounded-lg border border-slate/15 bg-white px-3"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles"
          value={query}
        />
        <select
          className="min-h-11 rounded-lg border border-slate/15 bg-white px-3"
          onChange={(event) => setCategory(event.target.value)}
          value={category}
        >
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {visibleArticles.map((article) => (
          <article className="rounded-lg bg-white p-6 shadow-sm" key={article.slug}>
            <Badge variant={article.isSponsored ? "sponsored" : "primary"}>
              {article.category}
            </Badge>
            <h2 className="mt-4 text-xl font-semibold text-slate">{article.title}</h2>
            <p className="mt-3 line-clamp-2 text-sm text-slate/65">{article.excerpt}</p>
            <p className="mt-4 text-xs text-slate/45">
              {article.readingTime} min read - {article.author}
            </p>
            <Link className="mt-5 inline-flex text-sm font-semibold text-primary" href={`/blog/${article.slug}`}>
              Read →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
