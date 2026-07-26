/// <reference types="node" />

declare module 'b4a';

declare module '*.bundle.js' {
  const content: string;
  export default content;
}
