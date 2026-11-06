import type { SVGProps } from "react";

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 12 4 4L19 6"
      />
    </svg>
  );
}

export function TrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 21h8m-4-4v4m-7-4h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8 10 2 2 4-4"
      />
    </svg>
  );
}

export function LessonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.5c-1.5-1-3.5-1.5-6-1.5v13c2.5 0 4.5.5 6 1.5m0-13c1.5-1 3.5-1.5 6-1.5v13c-2.5 0-4.5.5-6 1.5m0-13v13"
      />
    </svg>
  );
}

export function ExerciseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
