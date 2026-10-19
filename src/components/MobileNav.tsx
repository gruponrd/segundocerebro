import { NavLink, useLocation } from "react-router-dom";
import { ArrowLeftRight, Brain, Calculator, Contrast, DollarSign, Gamepad2, LayoutDashboard, Link2, Moon, MoreHorizontal, Search, Sparkles, Sun, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { openCommandMenu } from "@/lib/commandMenu";
import { isDesignPreview } from "@/lib/previewMode";
import { LogoutButton } from "@/components/LogoutButton";
const labels = { dark:"Escuro", light:"Claro", monochrome:"P&B" };
const mainTabs = [{to:"/",icon:LayoutDashboard,label:"Início",end:true},{to:"/fluxo",icon:ArrowLeftRight,label:"Fluxo"},{to:"/carteira",icon:Wallet,label:"Carteira"},{to:"/objetivos",icon:Target,label:"Objetivos"}];
const moreTabs = [{to:"/renda",icon:DollarSign,label:"Renda"},{to:"/divida",icon:TrendingDown,label:"Dívidas"},{to:"/desejos",icon:Sparkles,label:"Desejos"},{to:"/trade",icon:TrendingUp,label:"Trade"},{to:"/lifegame",icon:Gamepad2,label:"LifeGame"},{to:"/ferramentas",icon:Calculator,label:"Ferramentas"},{to:"/integracoes",icon:Link2,label:"Integrações"}];
export function MobileNav() {
 const [open,setOpen]=useState(false);
 const {pathname}=useLocation();
 const {theme,toggleTheme}=useTheme();
 const ThemeIcon=theme==="dark"?Moon:theme==="light"?Sun:Contrast;
 const active=moreTabs.some(tab=>tab.to===pathname);
 return <nav aria-label="Navegação principal no celular" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
  <div className="flex h-[72px] items-center justify-around gap-1">
   {mainTabs.map(tab=><NavLink key={tab.to} to={tab.to} end={tab.end} className={({isActive})=>cn("flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs",isActive?"text-accent":"text-muted-foreground")}><tab.icon aria-hidden className="h-5 w-5" /><span>{tab.label}</span></NavLink>)}
   <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><button type="button" className={cn("flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs",active?"text-accent":"text-muted-foreground")} aria-label="Mais seções"><MoreHorizontal aria-hidden className="h-5 w-5" /><span>Mais</span></button></SheetTrigger>
    <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl border-border bg-card pb-[max(24px,env(safe-area-inset-bottom))]">
     <SheetHeader className="text-left"><SheetTitle>Seu espaço</SheetTitle><SheetDescription>Todas as áreas do Segundo Cérebro.</SheetDescription></SheetHeader>
     <Button variant="outline" className="my-5 w-full justify-start" onClick={()=>{setOpen(false);openCommandMenu();}}><Search aria-hidden className="h-4 w-4" /> Buscar no app</Button>
     <div className="grid grid-cols-3 gap-2">{moreTabs.map(tab=><NavLink key={tab.to} to={tab.to} onClick={()=>setOpen(false)} className={({isActive})=>cn("flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl text-xs",isActive?"bg-secondary text-accent":"text-muted-foreground hover:bg-secondary")}><tab.icon aria-hidden className="h-5 w-5" />{tab.label}</NavLink>)}{isDesignPreview&&<NavLink to="/acesso" onClick={()=>setOpen(false)} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl text-xs text-muted-foreground"><Brain aria-hidden className="h-5 w-5" />Ver login</NavLink>}</div>
     <Button variant="ghost" onClick={toggleTheme} className="mt-4 w-full justify-between border-t border-border pt-4"><span className="flex items-center gap-2"><ThemeIcon aria-hidden className="h-4 w-4" />Tema</span><span>{labels[theme]}</span></Button>
     <LogoutButton mobile onSignedOut={()=>setOpen(false)} />
    </SheetContent>
   </Sheet>
  </div>
 </nav>;
}
