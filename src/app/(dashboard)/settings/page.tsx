"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
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

export default function SettingsPage() {
	const { data: session } = useSession();
	const router = useRouter();

	const [name, setName] = useState(session?.user?.name ?? "");
	const [saving, setSaving] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

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
				<p className="text-sm text-muted-foreground">Manage your profile and account</p>
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
