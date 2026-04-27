import { ErrorBoundary } from "@/components/error-boundary";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-screen">
			<Sidebar />
			<div className="flex flex-1 flex-col overflow-hidden">
				<Header />
				<main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
					<div className="mx-auto max-w-7xl">
						<ErrorBoundary>{children}</ErrorBoundary>
					</div>
				</main>
			</div>
			<MobileNav />
		</div>
	);
}
