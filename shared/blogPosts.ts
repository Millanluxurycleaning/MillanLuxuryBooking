// Blog posts that live in the website code (not the admin), so they can be reviewed on a preview
// before going live. Their text is in client/src/data/blogContent.ts under the same slug.
// Listed here too so the sitemap (server) can include them.

export interface CodeBlogPost {
  slug: string;
  title: string;
  date: string; // ISO date
}

export const codeBlogPosts: CodeBlogPost[] = [
  {
    slug: "holiday-hosting-cleaning-checklist-phoenix",
    title: "Holiday Hosting in the Valley: Your Pre-Thanksgiving Cleaning Checklist",
    date: "2026-10-19T12:00:00Z",
  },
];
