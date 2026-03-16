/* biome-ignore-all lint/suspicious/noArrayIndexKey: static read-only CV data */
"use client";

import { Award, Briefcase, GraduationCap, Mail, MapPin, Phone, User, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParsedCV } from "@/lib/gemini";

interface CVSectionDisplayProps {
	parsedSections: ParsedCV;
}

export function CVSectionDisplay({ parsedSections }: CVSectionDisplayProps) {
	const { contact, summary, experience, education, skills, certifications } = parsedSections;

	return (
		<div className="space-y-4">
			{/* Contact */}
			{contact?.name && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<User className="h-4 w-4 text-primary" />
							Contact Information
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid gap-2 text-sm sm:grid-cols-2">
							{contact.name && <p className="font-medium text-foreground">{contact.name}</p>}
							{contact.email && (
								<p className="flex items-center gap-1.5 text-muted-foreground">
									<Mail className="h-3.5 w-3.5" />
									{contact.email}
								</p>
							)}
							{contact.phone && (
								<p className="flex items-center gap-1.5 text-muted-foreground">
									<Phone className="h-3.5 w-3.5" />
									{contact.phone}
								</p>
							)}
							{contact.location && (
								<p className="flex items-center gap-1.5 text-muted-foreground">
									<MapPin className="h-3.5 w-3.5" />
									{contact.location}
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Summary */}
			{summary && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">Professional Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
					</CardContent>
				</Card>
			)}

			{/* Experience */}
			{experience.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Briefcase className="h-4 w-4 text-primary" />
							Work Experience
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{experience.map((exp, i) => (
							<div
								key={`${exp.company}-${exp.title}-${i}`}
								className={i > 0 ? "border-t border-border pt-4" : ""}
							>
								<div className="mb-1 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
									<h4 className="font-medium">{exp.title}</h4>
									<span className="text-xs text-muted-foreground">
										{exp.startDate} – {exp.endDate}
									</span>
								</div>
								<p className="mb-2 text-sm text-primary/80">{exp.company}</p>
								{exp.bullets.length > 0 && (
									<ul className="space-y-1">
										{exp.bullets.map((bullet, j) => (
											<li
												key={`bullet-${i}-${j}`}
												className="flex gap-2 text-sm text-muted-foreground"
											>
												<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
												{bullet}
											</li>
										))}
									</ul>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Education */}
			{education.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<GraduationCap className="h-4 w-4 text-primary" />
							Education
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{education.map((edu, i) => (
							<div
								key={`${edu.institution}-${i}`}
								className={i > 0 ? "border-t border-border pt-3" : ""}
							>
								<div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
									<h4 className="font-medium">
										{edu.degree} {edu.field && `in ${edu.field}`}
									</h4>
									<span className="text-xs text-muted-foreground">
										{edu.startDate} – {edu.endDate}
									</span>
								</div>
								<p className="text-sm text-muted-foreground">{edu.institution}</p>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Skills */}
			{Object.keys(skills).length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Wrench className="h-4 w-4 text-primary" />
							Skills
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{Object.entries(skills).map(([category, skillList]) => (
							<div key={category}>
								<p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
									{category}
								</p>
								<div className="flex flex-wrap gap-1.5">
									{skillList.map((skill) => (
										<span
											key={skill}
											className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
										>
											{skill}
										</span>
									))}
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			{/* Certifications */}
			{certifications.length > 0 && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="flex items-center gap-2 text-base">
							<Award className="h-4 w-4 text-primary" />
							Certifications
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{certifications.map((cert, i) => (
							<div key={`${cert.name}-${i}`} className="text-sm">
								<p className="font-medium">{cert.name}</p>
								{(cert.issuer || cert.date) && (
									<p className="text-xs text-muted-foreground">
										{[cert.issuer, cert.date].filter(Boolean).join(" · ")}
									</p>
								)}
							</div>
						))}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
