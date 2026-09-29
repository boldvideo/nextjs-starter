"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="sunset-bar inline-flex items-center gap-2 h-10 px-4 rounded-xl font-display text-[14px] text-[#1a0616] cursor-pointer active:scale-95 transition-transform"
    >
      <Printer className="h-4 w-4" />
      PRINT IT
    </button>
  );
}
