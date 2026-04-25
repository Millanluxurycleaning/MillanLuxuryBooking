import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Post } from "@shared/types";
import { Navigation } from "@/components/Navigation";
import { PageSEO } from "@/components/PageSEO";

const formatDate = (value?: string | Date | null) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

export default function BlogIndex() {
  const { data: posts = [], isLoading, error } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
    retry: false,
  });

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [posts]
  );

  return (
    <div className="min-h-screen bg-background">
      <PageSEO
        title="Blog — Cleaning Tips, News & Behind-the-Scenes"
        description="Read cleaning tips, home care guides, and company updates from the Millan Luxury Cleaning team. Expert advice for keeping your home spotless."
        path="/blog"
      />
      <Navigation />
      <div className="container mx-auto px-6 py-12 max-w-4xl pt-32">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Blog</p>
          <h1 className="text-4xl font-serif font-semibold mb-3">Latest Updates</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stay up to date with Millan Luxury Cleaning news, tips, and behind-the-scenes stories.
          </p>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading posts...</p>}
        {error && <p className="text-destructive">Failed to load posts.</p>}

        {!isLoading && !error && sortedPosts.length === 0 && (
          <p className="text-muted-foreground">No posts available yet. Check back soon!</p>
        )}

        <div className="space-y-6">
          {sortedPosts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="block group">
              <article className="rounded-xl border border-primary/10 bg-card/60 p-6 transition hover:border-primary/40 hover:shadow-lg">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span>{formatDate(post.createdAt)}</span>
                  <span>•</span>
                  <span className="uppercase tracking-wide">{post.published ? "Published" : "Draft"}</span>
                </div>
                <h2 className="text-2xl font-serif font-semibold group-hover:text-primary transition">{post.title}</h2>
                <p className="mt-2 text-muted-foreground line-clamp-3">{post.excerpt}</p>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
