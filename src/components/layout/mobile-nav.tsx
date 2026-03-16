"use client";

import { Briefcase, FileText, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/cv", label: "My CV", icon: FileText },
	{ href: "/applications", label: "Apps", icon: Briefcase },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
	const pathname = usePathname();

	return (
		<nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-sidebar py-2 md:hidden">
			{navItems.map((item) => {
				const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
							isActive
								? "text-primary"
								: "text-sidebar-foreground/60 hover:text-sidebar-foreground",
						)}
					>
						<item.icon className="h-5 w-5" />
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}
