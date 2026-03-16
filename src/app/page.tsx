import { ArrowRight, Download, FileText, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const features = [
	{
		icon: FileText,
		title: "Upload Once",
		description: "Upload your master CV and we parse it into structured sections using AI.",
	},
	{
		icon: Target,
		title: "Match Analysis",
		description: "Get a match score, skill gap analysis, and actionable recommendations.",
	},
	{
		icon: Sparkles,
		title: "AI Tailoring",
		description:
			"Generate a tailored CV that highlights your most relevant experience for each job.",
	},
	{
		icon: Download,
		title: "Export Anywhere",
		description: "Edit inline and export as PDF or DOCX, ready to submit.",
	},
];

export default function LandingPage() {
	return (
		<div className="flex min-h-screen flex-col">
			<header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-8">
				<div className="flex items-center gap-2">
					<FileText className="h-6 w-6 text-primary" />
					<span className="text-lg font-semibold">CV Tailor</span>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="ghost" render={<Link href="/sign-in" />}>
						Sign in
					</Button>
					<Button render={<Link href="/sign-up" />}>Get started</Button>
				</div>
			</header>

			<main className="flex-1">
				<section className="flex flex-col items-center justify-center px-4 py-20 text-center md:py-32">
					<div className="mb-4 inline-flex items-center rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
						AI-powered CV optimization
					</div>
					<h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
						Tailor your CV for <span className="text-primary">every job application</span>
					</h1>
					<p className="mb-8 max-w-lg text-lg text-muted-foreground">
						Upload your CV once. Paste a job description. Get an AI-optimized CV that highlights
						your most relevant experience — in seconds.
					</p>
					<div className="flex gap-3">
						<Button size="lg" render={<Link href="/sign-up" />}>
							Start for free
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</div>
				</section>

				<section className="border-t border-border px-4 py-16 md:px-8">
					<div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
						{features.map((feature) => (
							<div key={feature.title} className="flex gap-4">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<feature.icon className="h-5 w-5 text-primary" />
								</div>
								<div>
									<h3 className="mb-1 font-semibold">{feature.title}</h3>
									<p className="text-sm text-muted-foreground">{feature.description}</p>
								</div>
							</div>
						))}
					</div>
				</section>
			</main>

			<footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">
				CV Tailor &mdash; Built to help you land the right job.
			</footer>
		</div>
	);
}
