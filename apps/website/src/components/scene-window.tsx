import type { ReactNode } from "react";

/** Static native chrome adapted from the stageshow kit's Window terminal branch.
 * Keeps its 38px title bar and centered 9px lights; the host supplies its colors.
 * @returns The framed illustration content.
 */
export const SceneWindow = ({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) => (
  <div className="portfolio-scene-window">
    <div className="portfolio-scene-chrome">
      <span className="portfolio-scene-lights">
        <span />
        <span />
        <span />
      </span>
      <span>{title}</span>
    </div>
    {children}
  </div>
);
