import Link from "next/link";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { ModuleIcon } from "./ModuleIcon";

export type ToolGuideStep = {
  moduleKey: string;
  title: string;
  description: string;
  href?: string;
};

export function ToolGuide({
  title,
  eyebrow = "uso recomendado",
  summary,
  steps
}: {
  title: string;
  eyebrow?: string;
  summary: string;
  steps: ToolGuideStep[];
}) {
  return (
    <CollapsiblePanel title={title} eyebrow={eyebrow} summary={summary}>
      <div className="tool-guide-grid">
        {steps.map((step) => {
          const content = (
            <>
              <ModuleIcon moduleKey={step.moduleKey} size={34} showSprite={false} />
              <span>
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </span>
            </>
          );

          if (step.href) {
            return (
              <Link className="tool-guide-step" href={step.href} key={step.title}>
                {content}
              </Link>
            );
          }

          return (
            <div className="tool-guide-step" key={step.title}>
              {content}
            </div>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}
