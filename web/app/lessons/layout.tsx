import './lessons.css';

/**
 * The lessons segment. Exists only to load the section's stylesheet once for
 * `/lessons` and every `/lessons/:id` beneath it — the stage chrome, the
 * cards, and the dark frame the shared diagrams render inside.
 */
export default function LessonsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
