declare module '*.svg' {
  import type React from 'react';
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module 'react-dom/client' {
  import type { ReactNode } from 'react';
  export type Root = { render(children: ReactNode): void; unmount(): void };
  export function createRoot(container: Element | DocumentFragment): Root;
}
