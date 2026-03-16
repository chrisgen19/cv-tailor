"use client";

import { Briefcase, FileText, LayoutDashboard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/cv", label: "My CV", icon: FileText },
	{ href: "/applications", label: "Applications", icon: Briefcase },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="hidden md:flex h-screen w-60 flex-col border-r border-border bg-sidebar">
			<div className="flex h-14 items-center gap-2 border-b border-border px-4">
				<FileText className="h-6 w-6 text-primary" />
				<span className="text-lg font-semibold text-sidebar-foreground">CV Tailor</span>
			</div>
			<nav className="flex-1 space-y-1 p-3">
				{navItems.map((item) => {
					const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
					return (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
								isActive
									? "bg-sidebar-accent text-sidebar-primary"
									: "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
							)}
						>
							<item.icon className="h-4 w-4" />
							{item.label}
						</Link>
					);
				})}
			</nav>
		</aside>
	);
}
