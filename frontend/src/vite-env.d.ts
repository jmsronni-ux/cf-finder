/// <reference types="vite/client" />

// ElevenLabs Agent Widget custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { 'agent-id'?: string }, HTMLElement>;
    }
  }
}

export {};
