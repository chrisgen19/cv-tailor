"use client";

import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
	children: React.ReactNode;
	fallbackMessage?: string;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	render() {
		if (this.state.hasError) {
			return (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-10 text-center">
						<AlertTriangle className="mb-3 h-8 w-8 text-destructive/60" />
						<h3 className="mb-1 text-base font-medium">Something went wrong</h3>
						<p className="mb-4 max-w-sm text-sm text-muted-foreground">
							{this.props.fallbackMessage ?? "An unexpected error occurred. Please try again."}
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => this.setState({ hasError: false, error: null })}
						>
							<RefreshCw className="mr-2 h-3.5 w-3.5" />
							Try Again
						</Button>
					</CardContent>
				</Card>
			);
		}

		return this.props.children;
	}
}
