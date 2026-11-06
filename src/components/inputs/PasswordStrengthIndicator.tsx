import { evaluatePasswordStrength, type PasswordStrengthLevel } from "@/utils/passwordStrength";

interface PasswordStrengthIndicatorProps {
  id: string;
  password: string;
}

const BAR_TONE: Record<PasswordStrengthLevel, string> = {
  empty: "bg-border",
  weak: "bg-cancel",
  medium: "bg-accent",
  strong: "bg-confirm",
};

export function PasswordStrengthIndicator({ id, password }: PasswordStrengthIndicatorProps) {
  const strength = evaluatePasswordStrength(password);

  return (
    <div id={id} className="flex flex-col gap-2 text-xs text-foreground">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3].map((step) => (
            <span
              key={step}
              className={`h-1.5 flex-1 rounded-full ${
                step <= strength.score ? BAR_TONE[strength.level] : "bg-border"
              }`}
            />
          ))}
        </div>
        <span role="status" className="font-medium">
          {strength.label}
        </span>
      </div>

      <ul aria-label="Requisitos da senha" className="flex flex-col gap-0.5">
        {strength.requirements.map((requirement) => (
          <li
            key={requirement.id}
            className={requirement.met ? "text-foreground" : "text-foreground-muted"}
          >
            <span aria-hidden="true">{requirement.met ? "✓" : "○"} </span>
            {requirement.label}
            <span className="sr-only">{requirement.met ? " (atendido)" : " (pendente)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}