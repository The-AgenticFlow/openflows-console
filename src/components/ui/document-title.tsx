// DocumentTitle: sets the browser tab title from a client component, for the
// few screens where Next's metadata cannot (the root not-found page inherits
// the title of the route that failed). Renders nothing.
"use client";

import { useEffect } from "react";

export function DocumentTitle({ title }: Readonly<{ title: string }>) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}
