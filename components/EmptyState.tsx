import Link from "next/link";
import { ModuleIcon } from "./ModuleIcon";

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  moduleKey = "home",
  title
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  moduleKey?: string;
  title: string;
}) {
  return (
    <div className="empty-state">
      <ModuleIcon moduleKey={moduleKey} size={38} showSprite={false} />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {actionHref && actionLabel ? (
          <Link className="quick-btn" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
