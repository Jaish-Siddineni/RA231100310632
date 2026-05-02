import type { AppProps } from "next/app";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useMemo, useState } from "react";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  const [mode] = useState<"light" | "dark">("light");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: "#1565c0" },
          secondary: { main: "#6a1b9a" },
          success: { main: "#2e7d32" },
          warning: { main: "#e65100" },
          background: {
            default: mode === "light" ? "#f5f7fa" : "#121212",
            paper: mode === "light" ? "#ffffff" : "#1e1e1e",
          },
        },
        typography: {
          fontFamily: "'Roboto', 'Helvetica Neue', sans-serif",
          h4: { fontWeight: 700 },
          h5: { fontWeight: 600 },
          h6: { fontWeight: 600 },
        },
        shape: { borderRadius: 10 },
        components: {
          MuiCard: {
            styleOverrides: {
              root: { borderRadius: 12 },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: { fontWeight: 600 },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Head>
        <title>Campus Notifications</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
