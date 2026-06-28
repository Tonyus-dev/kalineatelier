import type { ComponentProps } from "react";
import { kalineWordmark } from "@/lib/brand-assets";
import { kalineApple } from "@/lib/brand-assets";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Mic,
  Home,
  LogOut,
  CalendarDays,
  Sparkle,
  Feather,
  Flower2,
  Sprout,
  UserCircle,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { isOfflineMode } from "@/lib/local/runtime-mode";

const groups = [
  {
    label: "Cockpit",
    items: [
      { title: "Home", url: "/home", icon: Home },
      { title: "Facetas", url: "/facetas", icon: Sparkle },
      { title: "Registro Vivo", url: "/registro-vivo", icon: Feather },
      { title: "Jardim", url: "/jardim", icon: Flower2 },
      { title: "Revisão", url: "/revisao", icon: Sprout },
    ],
  },

  {
    label: "Estudo · Klio",
    items: [
      { title: "Klio", url: "/klio", icon: BookOpen },
      { title: "Agenda", url: "/agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Biblioteca",
    items: [
      { title: "Câmara de Eco", url: "/camara", icon: Mic },
      { title: "Livros & Resumos", url: "/livros", icon: BookOpen },
    ],
  },
  {
    label: "Pessoas",
    items: [{ title: "Meu perfil", url: "/perfil", icon: UserCircle }],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const router = useRouter();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();

  function closeSidebar() {
    if (isMobile) setOpenMobile(false);
    else setOpen(false);
  }

  async function signOut() {
    if (isOfflineMode()) {
      // Offline: sem sessão para encerrar — volta ao /chat.
      await navigate({ to: "/chat" });
      return;
    }
    await supabase.auth.signOut();
    await router.invalidate();
    await navigate({ to: "/auth" });
  }

  const conversas = [
    { facet: "kaline", label: "Kaline", icon: Sparkle, url: "/chat", apple: kalineApple.url },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="border-b border-[color:var(--sidebar-border)] p-3">
          <div className="flex items-center gap-2">
            <div className="relative h-10 w-10 shrink-0">
              <img src={kalineApple.url} alt="Kaline" className="h-10 w-10 apple-glow" />
            </div>
            <div className="min-w-0 leading-tight">
              <img src={kalineWordmark.url} alt="KALINE" className="h-4 w-auto" />
              <div className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]">
                em modo <span className="text-[color:var(--ivory)]">Multifacetado</span>
              </div>
            </div>
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ivory-dim)]">
            Conversas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversas.map(({ facet, label, apple }) => {
                const active = path === "/chat" || path.startsWith("/chat/");

                return (
                  <SidebarMenuItem key={facet}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to="/chat" onClick={closeSidebar} className="flex items-center gap-2">
                        <img src={apple} alt="" className="h-4 w-4 apple-glow" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ivory-dim)]">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = path === item.url || path.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link
                          to={item.url as ComponentProps<typeof Link>["to"]}
                          onClick={closeSidebar}
                          className="flex items-center gap-2"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
