# i3-sway-ipc-bun

This program wraps the I3/Sway IPC socket and performs actions based on the
events it receives.
The currently handled events are:

- window
  - can be used to dim windows that are currently not focused through the
    [window dimming feature](./features/windowDimming.ts)

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts --help
```

You can also run the script through the bun binary folder by utilizing `bun link`.

```bash
bun link
i3-sway-ipc-bun --help
```
