import { cn } from "@/lib/utils";

interface MatchScoreRingProps {
	score: number;
	size?: number;
}

function getScoreColor(score: number) {
	if (score >= 75) return { stroke: "stroke-emerald-400", text: "text-emerald-400" };
	if (score >= 50) return { stroke: "stroke-amber-400", text: "text-amber-400" };
	return { stroke: "stroke-red-400", text: "text-red-400" };
}

export function MatchScoreRing({ score, size = 120 }: MatchScoreRingProps) {
	const strokeWidth = 8;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (score / 100) * circumference;
	const colors = getScoreColor(score);

	return (
		<div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
			<svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Match score: ${score} out of 100`}>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					stroke="currentColor"
					strokeWidth={strokeWidth}
					className="text-muted/50"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					className={cn("transition-all duration-1000 ease-out", colors.stroke)}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span className={cn("text-2xl font-bold", colors.text)}>{score}</span>
				<span className="text-[10px] text-muted-foreground">/ 100</span>
			</div>
		</div>
	);
}
