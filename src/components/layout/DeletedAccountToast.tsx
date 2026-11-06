"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function DeletedAccountToast() {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      router.replace("/", { scroll: false });
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  if (!isVisible) return null;

  return (
    <div className="mx-auto mb-6 max-w-md rounded-md bg-confirm p-4 text-center text-sm font-medium text-white shadow-sm transition-opacity duration-300">
      Sua conta foi excluída com sucesso.
    </div>
  );
}