declare module "react-katex" {
  import type { ComponentType, CSSProperties } from "react";

  interface KatexProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => string;
    settings?: Record<string, unknown>;
    className?: string;
    style?: CSSProperties;
  }

  export const BlockMath: ComponentType<KatexProps>;
  export const InlineMath: ComponentType<KatexProps>;
}
