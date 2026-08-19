/**
 * Renders a JSON-LD structured data script tag. The "<" escape prevents a
 * literal "</script>" (or similar) inside a string value from breaking out
 * of the script tag early; the JSON content itself is always built from
 * app data, never raw user input.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
