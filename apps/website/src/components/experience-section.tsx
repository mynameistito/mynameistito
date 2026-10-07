import { useState } from "react";

import { profile } from "@/lib/profile";

/** Renders Akshar's work history, with detail revealed on request.
 * @returns The expandable work history.
 */
export const ExperienceSection = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <section aria-labelledby="experience-title" className="mt-[38px]">
      <div className="mb-3 flex min-h-7 items-center justify-between gap-6">
        <h2
          className="m-0 text-base font-semibold leading-heading tracking-heading text-text"
          id="experience-title"
        >
          Experience
        </h2>
        <button
          aria-expanded={expanded}
          className="py-1 text-xs leading-5 text-muted transition-colors hover:text-text"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? "See less" : "See more"}
        </button>
      </div>
      <ul className="m-0 list-none border-t border-line p-0">
        {profile.experience.map((role) => (
          <li
            className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-3 border-b border-line py-3.5"
            key={`${role.company}-${role.title}`}
          >
            <div className="grid size-9 place-items-center rounded-lg border border-line-strong bg-surface-raised">
              <img
                alt=""
                className="size-[26px] rounded-md object-cover"
                height="26"
                loading="lazy"
                src={role.logo}
                width="26"
              />
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5">
              <div className="min-w-0">
                <h3 className="m-0 text-sm font-semibold leading-5 tracking-row text-text">
                  {role.company}
                </h3>
                <p className="m-0 text-xs leading-row text-muted">
                  {role.title}
                </p>
              </div>
              <p className="m-0 text-right text-xs leading-row text-muted">
                {role.period}
              </p>
              {expanded && (
                <ul className="col-span-2 mt-2 grid gap-2 pl-4 text-xs leading-meta text-muted marker:text-subtle">
                  {role.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
