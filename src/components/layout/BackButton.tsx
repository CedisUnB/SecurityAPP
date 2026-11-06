"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function handleClick() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}