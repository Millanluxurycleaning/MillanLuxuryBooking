import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Post } from "@shared/types";
import { ApiError } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import { PageSEO } from "@/components/PageSEO";
import { BlogBody } from "@/components/BlogBody";
import { blogContent } from "@/data/blogContent";
import { codeBlogPosts } from "@shared/blogPosts";

const formatDate = (value?: string | Date | null) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

export default function BlogPost({ params }: { params: { slug: string } }) {
  const { data: savedPost, isLoading, error } = useQuery<Post>({
    queryKey: [`/api/posts/${params.slug}`],
    retry: false,
  });
  // Full article text lives in blogContent; fall back to what's saved in the admin
  const full = blogContent[params.slug];
  const codePost = codeBlogPosts.find((c) => c.slug === params.slug);
  const post: Post | undefined = savedPost
    ? {
        ...savedPost,
        createdAt: full?.date ?? savedPost.createdAt,
        updatedAt: full?.date ?? savedPost.updatedAt,
        excerpt: full?.excerpt ?? savedPost.excerpt,
        body: full?.body ?? savedPost.body,
      }
    : codePost && full
      ? {
          id: 0,
          slug: codePost.slug,
          title: codePost.title,
          excerpt: full.excerpt ?? "",
          body: full.body,
          published: true,
          createdAt: codePost.date,
          updatedAt: codePost.date,
        }
      : savedPost;

  // A post written in the code exists even if the admin doesn't have it
  const notFound = !post && error instanceof ApiError && error.status === 404;

  const articleSchema = post
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.excerpt,
        datePublished: post.createdAt,
        dateModified: post.updatedAt,
        author: {
          "@type": "Organization",
          name: "Millan Luxury Cleaning",
          url: "https://millanluxurycleaning.com",
        },
        publisher: {
          "@type": "Organization",
          name: "Millan Luxury Cleaning",
          logo: {
            "@type": "ImageObject",
            url: "https://millanluxurycleaning.com/favicon.png",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://millanluxurycleaning.com/blog/${params.slug}`,
        },
      }
    : undefined;

  return (
    <div className="min-h-screen bg-background">
      {post && (
        <PageSEO
          title={post.title}
          description={post.excerpt}
          path={`/blog/${params.slug}`}
          type="article"
          publishedAt={post.createdAt ? new Date(post.createdAt).toISOString() : undefined}
          modifiedAt={post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined}
          schema={articleSchema}
        />
      )}
      {notFound && (
        <PageSEO
          title="Post Not Found"
          description="This blog post could not be found."
          path={`/blog/${params.slug}`}
          noindex
        />
      )}
      <Navigation />
      <div className="container mx-auto px-6 py-12 max-w-3xl pt-32">
        <div className="mb-6 text-sm">
          <Link href="/blog" className="text-primary hover:underline">
            ← Back to blog
          </Link>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading post...</p>}

        {notFound && <p className="text-destructive">Post not found.</p>}

        {!isLoading && !notFound && post && (
          <article className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{formatDate(post.createdAt)}</p>
              <h1 className="text-4xl font-serif font-semibold leading-tight">{post.title}</h1>
            </div>
            <p className="text-lg text-muted-foreground">{post.excerpt}</p>
            <BlogBody text={post.body ?? ""} />
          </article>
        )}

        {error && !notFound && !post && !isLoading && (
          <p className="text-destructive">Failed to load post.</p>
        )}
      </div>
    </div>
  );
}
