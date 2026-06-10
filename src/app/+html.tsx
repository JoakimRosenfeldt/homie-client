import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

const globalStyles = `
  html, body, #root {
    user-select: none;
    -webkit-user-select: none;
  }

  #root * {
    user-select: none;
    -webkit-user-select: none;
  }
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
