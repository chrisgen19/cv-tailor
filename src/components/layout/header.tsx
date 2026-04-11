"use client";

import { LogOut, Monitor, Moon, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppearance } from "@/components/providers/theme-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { isThemeMode, type ThemeMode } from "@/lib/theme";

export function Header() {
	const { data: session } = useSession();
	const { mode, setMode } = useAppearance();
	const router = useRouter();

	const handleSignOut = async () => {
		await signOut();
		router.push("/sign-in");
	};

	const initials = session?.user?.name
		?.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	const handleModeChange = async (nextMode: ThemeMode) => {
		setMode(nextMode);
		try {
			await fetch("/api/settings/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ themeMode: nextMode }),
			});
		} catch {
			// Keep the previewed mode; settings page remains source of truth for explicit saves.
		}
	};

	return (
		<header className="flex h-14 items-center justify-between border-b border-border bg-background px-4 md:px-6">
			<div className="flex items-center gap-2 md:hidden">
				<span className="text-lg font-semibold">CV Tailor</span>
			</div>
			<div className="hidden md:block" />
			<DropdownMenu>
				<DropdownMenuTrigger className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
					<Avatar className="h-8 w-8">
						<AvatarImage
							src={session?.user?.image ?? undefined}
							alt={session?.user?.name ?? "User"}
						/>
						<AvatarFallback className="bg-primary/10 text-primary text-xs">
							{initials ?? <User className="h-4 w-4" />}
						</AvatarFallback>
					</Avatar>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-48">
					<div className="px-2 py-1.5">
						<p className="text-sm font-medium">{session?.user?.name}</p>
						<p className="text-xs text-muted-foreground">{session?.user?.email}</p>
					</div>
					<DropdownMenuSeparator />
					<DropdownMenuLabel>Theme mode</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={mode}
						onValueChange={(nextValue) => {
							if (!isThemeMode(nextValue)) {
								return;
							}
							void handleModeChange(nextValue);
						}}
					>
						<DropdownMenuRadioItem value="system">
							<Monitor className="mr-2 h-4 w-4" />
							System
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="dark">
							<Moon className="mr-2 h-4 w-4" />
							Dark
						</DropdownMenuRadioItem>
						<DropdownMenuRadioItem value="light">
							<Sun className="mr-2 h-4 w-4" />
							Light
						</DropdownMenuRadioItem>
					</DropdownMenuRadioGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleSignOut} className="text-destructive">
						<LogOut className="mr-2 h-4 w-4" />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</header>
	);
}
