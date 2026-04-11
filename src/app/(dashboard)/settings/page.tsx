"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppearance } from "@/components/providers/appearance-provider";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
	DEFAULT_THEME_ACCENT,
	DEFAULT_THEME_MODE,
	THEME_ACCENTS,
	THEME_MODES,
	type ThemeAccent,
	type ThemeMode,
} from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const MODE_OPTIONS: Array<{
	value: ThemeMode;
	label: string;
	icon: typeof Monitor;
	description: string;
}> = [
	{
		value: "system",
		label: "System",
		icon: Monitor,
		description: "Follow your device appearance",
	},
	{
		value: "dark",
		label: "Dark",
		icon: Moon,
		description: "High-contrast dark surfaces",
	},
	{
		value: "light",
		label: "Light",
		icon: Sun,
		description: "Clean and bright layout",
	},
];

export default function SettingsPage() {
	const { data: session } = useSession();
	const { mode, accent, setMode, setAccent } = useAppearance();
	const router = useRouter();

	const [name, setName] = useState(session?.user?.name ?? "");
	const [saving, setSaving] = useState(false);
	const [appearanceSaving, setAppearanceSaving] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [themeMode, setThemeMode] = useState<ThemeMode>(mode);
	const [themeAccent, setThemeAccent] = useState<ThemeAccent>(accent);

	useEffect(() => {
		if (session?.user?.name) {
			setName(session.user.name);
		}
	}, [session?.user?.name]);

	useEffect(() => {
		setThemeMode(mode);
	}, [mode]);

	useEffect(() => {
		setThemeAccent(accent);
	}, [accent]);

	useEffect(() => {
		let cancelled = false;
		const loadProfile = async () => {
			try {
				const res = await fetch("/api/settings/profile", { method: "GET" });
				if (!res.ok) {
					return;
				}
				const data = (await res.json()) as {
					name: string;
					themeMode?: ThemeMode;
					themeAccent?: ThemeAccent;
				};
				if (cancelled) {
					return;
				}
				setName(data.name);
				const nextMode = THEME_MODES.includes(data.themeMode ?? DEFAULT_THEME_MODE)
					? (data.themeMode ?? DEFAULT_THEME_MODE)
					: DEFAULT_THEME_MODE;
				const nextAccent =
					THEME_ACCENTS.find((item) => item.value === data.themeAccent)?.value ??
					DEFAULT_THEME_ACCENT;
				setThemeMode(nextMode);
				setThemeAccent(nextAccent);
				setMode(nextMode);
				setAccent(nextAccent);
			} catch {
				// Keep existing local state if loading fails.
			}
		};
		void loadProfile();
		return () => {
			cancelled = true;
		};
	}, [setAccent, setMode]);

	const handleSaveName = async () => {
		if (!name.trim()) {
			toast.error("Name is required");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/settings/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: name.trim() }),
			});
			if (!res.ok) throw new Error();
			toast.success("Profile updated");
		} catch {
			toast.error("Failed to update profile");
		} finally {
			setSaving(false);
		}
	};

	const handleModePreview = (nextMode: ThemeMode) => {
		setThemeMode(nextMode);
		setMode(nextMode);
	};

	const handleAccentPreview = (nextAccent: ThemeAccent) => {
		setThemeAccent(nextAccent);
		setAccent(nextAccent);
	};

	const handleSaveAppearance = async () => {
		setAppearanceSaving(true);
		try {
			const res = await fetch("/api/settings/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					themeMode,
					themeAccent,
				}),
			});
			if (!res.ok) {
				throw new Error();
			}
			toast.success("Appearance updated");
		} catch {
			toast.error("Failed to update appearance");
		} finally {
			setAppearanceSaving(false);
		}
	};

	const handleDeleteAccount = async () => {
		setDeleting(true);
		try {
			const res = await fetch("/api/settings/account", { method: "DELETE" });
			if (!res.ok) throw new Error();
			await signOut();
			router.push("/sign-in");
		} catch {
			toast.error("Failed to delete account");
			setDeleting(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl space-y-6">
			<div>
				<h1 className="text-2xl font-semibold">Settings</h1>
				<p className="text-sm text-muted-foreground">
					Manage your profile, appearance, and account
				</p>
			</div>

			{/* Profile */}
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							id="email"
							value={session?.user?.email ?? ""}
							disabled
							className="opacity-60"
						/>
						<p className="text-xs text-muted-foreground">
							Email cannot be changed.
						</p>
					</div>
					<Button onClick={handleSaveName} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Save Changes
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Appearance</CardTitle>
					<p className="text-sm text-muted-foreground">
						Choose your mode and accent for a cleaner, more personalized workspace.
					</p>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="space-y-2">
						<Label>Theme mode</Label>
						<div className="grid gap-2 sm:grid-cols-3">
							{MODE_OPTIONS.map((option) => {
								const Icon = option.icon;
								const active = themeMode === option.value;
								return (
									<Button
										key={option.value}
										type="button"
										variant={active ? "default" : "outline"}
										className={cn(
											"h-auto items-start justify-start gap-2 px-3 py-3 text-left",
											!active && "hover:border-primary/40",
										)}
										onClick={() => handleModePreview(option.value)}
									>
										<Icon className="mt-0.5 h-4 w-4 shrink-0" />
										<span className="space-y-0.5">
											<span className="block text-sm font-medium">{option.label}</span>
											<span className="block text-xs opacity-80">{option.description}</span>
										</span>
									</Button>
								);
							})}
						</div>
					</div>

					<div className="space-y-2">
						<Label>Accent color</Label>
						<div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
							{THEME_ACCENTS.map((accentOption) => {
								const selected = themeAccent === accentOption.value;
								return (
									<button
										type="button"
										key={accentOption.value}
										onClick={() => handleAccentPreview(accentOption.value)}
										className={cn(
											"relative flex h-11 w-full items-center justify-center rounded-md border border-border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
											selected && "border-primary ring-2 ring-primary/40",
										)}
										aria-label={`Use ${accentOption.label} accent`}
										title={accentOption.label}
									>
										<span
											className="h-6 w-6 rounded-full"
											style={{ backgroundColor: accentOption.swatch }}
										/>
										{selected && <Check className="absolute h-4 w-4 text-foreground" />}
									</button>
								);
							})}
						</div>
						<p className="text-xs text-muted-foreground">
							Accent colors update key actions, focus rings, and charts.
						</p>
					</div>

					<div className="rounded-lg border border-border bg-card p-3">
						<p className="text-sm font-medium">Preview</p>
						<p className="mb-3 text-xs text-muted-foreground">
							How your selected style looks in UI controls
						</p>
						<div className="flex items-center gap-2">
							<Button size="sm">Primary action</Button>
							<Button size="sm" variant="outline">
								Secondary
							</Button>
							<span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground">
								Accent
							</span>
						</div>
					</div>

					<Button onClick={handleSaveAppearance} disabled={appearanceSaving}>
						{appearanceSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Save Appearance
					</Button>
				</CardContent>
			</Card>

			{/* Danger Zone */}
			<Card className="border-destructive/30">
				<CardHeader>
					<CardTitle className="text-destructive">Danger Zone</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Permanently delete your account and all associated data including applications,
						uploaded CVs, and generated content. This action cannot be undone.
					</p>
					<Button variant="destructive" onClick={() => setDeleteOpen(true)}>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete Account
					</Button>
				</CardContent>
			</Card>

			{/* Delete Confirmation */}
			<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Account</DialogTitle>
						<DialogDescription>
							This will permanently delete your account, all applications, uploaded CVs, and
							generated content. This action cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
							{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete Everything
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
