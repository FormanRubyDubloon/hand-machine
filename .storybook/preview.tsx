import * as React from 'react'
import type { Preview } from '@storybook/react-vite'
import '../src/index.css'

// The design system switches mode with a `.dark` class on an ancestor.
// Putting it on <html> means portalled content (dialog, select, tooltip) follows too.
function ThemeSync({ theme, children }: { theme: string; children: React.ReactNode }) {
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  return <>{children}</>
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour mode',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, context) => (
      <ThemeSync theme={context.globals.theme ?? 'light'}>
        <Story />
      </ThemeSync>
    ),
  ],
  parameters: {
    options: {
      storySort: {
        order: ['Foundations', ['Colour', 'Typography', 'Spacing', 'Shape', 'Motion'], 'UI'],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo',
    },
  },
}

export default preview
