import { kalineWordmark } from "@/lib/brand-assets";
import { kalineApple } from "@/lib/brand-assets";
import { kharisApple } from "@/lib/brand-assets";
import { kuanyinApple } from "@/lib/brand-assets";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Scale,
  Gavel,
  Mic,
  Home,
  LogOut,
  CalendarDays,
  Sparkle,
  Dumbbell,
  Feather,
  Flower2,
  Sprout,
  Users,
  ShieldCheck,
  UserCircle,
  Gauge,
  MonitorPlay,
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
    label: "Corpo · Khora",
    items: [
      { title: "Treinos", url: "/treinos", icon: Dumbbell },
      { title: "Drive", url: "/drive", icon: Gauge },
    ],
  },
  {
    label: "Jurídico",
    items: [
      { title: "Corpus curado", url: "/juridico", icon: Gavel },
      { title: "Jurisprudência (pessoal)", url: "/jurisprudencia", icon: Gavel },
      { title: "Legislação (pessoal)", url: "/legislacao", icon: Scale },
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
    label: "Comércio · Kuan-Yin",
    items: [
      { title: "Showroom", url: "/kuan-yin/showroom", icon: MonitorPlay },
      { title: "Clientes", url: "/kuan-yin/clientes", icon: Users },
      { title: "Guardiões", url: "/kuan-yin/guardioes", icon: ShieldCheck },
      { title: "Negócio", url: "/kuan-yin/config", icon: Sparkle },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { title: "Meu perfil", url: "/perfil", icon: UserCircle },
      { title: "Perfis & convites", url: "/perfis", icon: Users },
    ],
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
    await supabase.auth.signOut();
    await router.invalidate();
    await navigate({ to: "/auth" });
  }

  const conversas = [
    { facet: "kaline", label: "Kaline", icon: Sparkle, url: "/chat", apple: kalineApple.url },
    {
      facet: "kharis",
      label: "Kháris",
      url: "/kharis",
      apple: kharisApple.url,
    },
    {
      facet: "kuanyin",
      label: "Kuan-Yin",
      url: "/kuan-yin",
      apple: kuanyinApple.url,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="border-b border-[color:var(--sidebar-border)] p-3">
          <div className="flex items-center gap-2">
            <div className="relative h-10 w-10 shrink-0">
              <img src={kalineApple.url} alt="Kaline" className="h-10 w-10 apple-glow" />
              <img
                src={kharisApple.url}
                alt="Kháris"
                className="absolute -bottom-1 -right-1 h-5 w-5 apple-glow"
              />
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
              {conversas.map(({ facet, label, url, apple }) => {
                const active =
                  (facet === "kaline" && (path === "/chat" || path.startsWith("/chat/"))) ||
                  (facet === "kharis" && path.startsWith("/kharis")) ||
                  (facet === "kuanyin" && (path === "/kuan-yin" || path.startsWith("/kuan-yin/")));

                return (
                  <SidebarMenuItem key={facet}>
                    <SidebarMenuButton asChild isActive={active}>
                      {facet === "kaline" ? (
                        <Link to="/chat" onClick={closeSidebar} className="flex items-center gap-2">
                          <img src={apple} alt="" className="h-4 w-4 apple-glow" />
                          <span>{label}</span>
                        </Link>
                      ) : (
                        <Link
                          to={url as any}
                          onClick={closeSidebar}
                          className="flex items-center gap-2"
                        >
                          <img src={apple} alt="" className="h-4 w-4 apple-glow" />
                          <span>{label}</span>
                        </Link>
                      )}
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
                          to={item.url as any}
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
