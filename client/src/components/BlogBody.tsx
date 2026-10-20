import { Fragment, type ReactNode } from "react";
import { Link } from "wouter";

// Renders simple blog formatting: "## " heading, "### " subheading, "- " bullets,
// **bold**, *italic*, and [text](link). Anything else is a normal paragraph.

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key++} className="text-foreground font-semibold">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const [, label, href] = token.match(/\[([^\]]+)\]\(([^)]+)\)/) ?? [];
      nodes.push(
        href?.startsWith("/") ? (
          <Link key={key++} href={href} className="text-primary underline underline-offset-4 hover:opacity-80">
            {label}
          </Link>
        ) : (
          <a key={key++} href={href} className="text-primary underline underline-offset-4 hover:opacity-80" rel="noopener">
            {label}
          </a>
        ),
      );
    } else {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

export function BlogBody({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="space-y-5 text-base md:text-lg leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trimEnd());
        if (lines[0].startsWith("## ")) {
          return (
            <h2 key={i} className="pt-4 font-serif text-2xl md:text-3xl font-semibold text-foreground">
              {renderInline(lines[0].slice(3))}
            </h2>
          );
        }
        if (lines[0].startsWith("### ")) {
          return (
            <h3 key={i} className="pt-2 font-serif text-xl font-semibold text-foreground">
              {renderInline(lines[0].slice(4))}
            </h3>
          );
        }
        if (lines.every((l) => l.startsWith("- "))) {
          return (
            <ul key={i} className="space-y-2 pl-1">
              {lines.map((l, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderInline(l.slice(2))}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
