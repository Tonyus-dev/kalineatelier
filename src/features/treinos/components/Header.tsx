import { khoraApple } from "@/lib/brand-assets";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-white/5 bg-[#08080E]/90 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3">
        <Link
          to="/klio"
          className="shrink-0 text-[#F3EBDD]/60 hover:text-[#D9A441] transition p-1 -ml-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <img src={khoraApple.url} alt="Khora" className="h-7 sm:h-8 w-auto apple-glow shrink-0" />
        <div className="leading-tight min-w-0 flex-1">
          <div className="serif text-[#D9A441] text-sm sm:text-base tracking-[0.16em] sm:tracking-[0.18em] truncate">
            KHORA TREINOS
          </div>
          <div className="hidden sm:block text-[10px] uppercase tracking-[0.22em] text-[#F3EBDD]/50 truncate">
            faceta da Kaline · treino vivo
          </div>
        </div>
      </div>
    </header>
  );
}
