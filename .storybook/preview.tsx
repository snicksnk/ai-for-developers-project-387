import type { Preview } from "@storybook/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import React from "react";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => {
      const queryClient = React.useMemo(
        () =>
          new QueryClient({
            defaultOptions: {
              queries: {
                retry: false,
              },
            },
          }),
        []
      );

      return (
        <MantineProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter>
              <Story />
            </MemoryRouter>
          </QueryClientProvider>
        </MantineProvider>
      );
    },
  ],
};

export default preview;
