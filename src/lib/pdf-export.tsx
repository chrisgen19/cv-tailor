import { existsSync } from "node:fs";
import path from "node:path";
import {
	Document,
	Font,
	Link,
	Page,
	StyleSheet,
	Text,
	View,
	renderToBuffer,
} from "@react-pdf/renderer";
import type {
	TailoredCv,
	TailoredCvCertification,
	TailoredCvEducation,
	TailoredCvExperience,
	TailoredCvHeader,
	TailoredCvProject,
	TailoredCvSkillGroup,
} from "@/lib/cv-schema";
import { CV_STYLES } from "@/lib/cv-styles";
import { parseInlineEmphasis } from "@/lib/inline-emphasis";

// ─── Font registration ───────────────────────────────────────────────────
// Calibri is proprietary — drop the TTF files into public/fonts/ to enable
// it. If any expected file is missing, we fall back to Helvetica so dev/CI
// still work without the font assets.

const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
const CALIBRI_FILES = {
	regular: path.join(FONTS_DIR, "Calibri.ttf"),
	bold: path.join(FONTS_DIR, "Calibri-Bold.ttf"),
	italic: path.join(FONTS_DIR, "Calibri-Italic.ttf"),
	boldItalic: path.join(FONTS_DIR, "Calibri-BoldItalic.ttf"),
};

let fontRegistered = false;
let resolvedFontFamily: "Calibri" | "Helvetica" = "Helvetica";

function registerFontsOnce(): "Calibri" | "Helvetica" {
	if (fontRegistered) return resolvedFontFamily;
	fontRegistered = true;

	const allPresent = Object.values(CALIBRI_FILES).every((p) => existsSync(p));
	if (!allPresent) {
		resolvedFontFamily = "Helvetica";
		return resolvedFontFamily;
	}

	Font.register({
		family: "Calibri",
		fonts: [
			{ src: CALIBRI_FILES.regular },
			{ src: CALIBRI_FILES.bold, fontWeight: "bold" },
			{ src: CALIBRI_FILES.italic, fontStyle: "italic" },
			{ src: CALIBRI_FILES.boldItalic, fontWeight: "bold", fontStyle: "italic" },
		],
	});
	resolvedFontFamily = "Calibri";
	return resolvedFontFamily;
}

// ─── Style tokens → react-pdf StyleSheet ────────────────────────────────

const COLOR_TEXT = `#${CV_STYLES.color.text}`;
const COLOR_HEADING = `#${CV_STYLES.color.heading}`;
const COLOR_MUTED = `#${CV_STYLES.color.muted}`;
const COLOR_ACCENT = `#${CV_STYLES.color.accent}`;
const MARGIN_PT = (inches: number) => inches * 72;

function buildStyles(family: string) {
	return StyleSheet.create({
		page: {
			fontFamily: family,
			fontSize: CV_STYLES.fontSize.body,
			color: COLOR_TEXT,
			lineHeight: CV_STYLES.lineHeight,
			paddingTop: MARGIN_PT(CV_STYLES.margin.top),
			paddingRight: MARGIN_PT(CV_STYLES.margin.right),
			paddingBottom: MARGIN_PT(CV_STYLES.margin.bottom),
			paddingLeft: MARGIN_PT(CV_STYLES.margin.left),
		},
		nameHeading: {
			fontSize: CV_STYLES.fontSize.h1,
			fontWeight: "bold",
			color: COLOR_HEADING,
			textAlign: "center",
			marginBottom: CV_STYLES.spacing.sectionAfter,
		},
		contactLine: {
			fontSize: CV_STYLES.fontSize.contact,
			color: COLOR_TEXT,
			textAlign: "center",
			marginBottom: CV_STYLES.spacing.sectionAfter,
		},
		sectionHeading: {
			fontSize: CV_STYLES.fontSize.h2,
			fontWeight: "bold",
			color: COLOR_HEADING,
			textTransform: "uppercase",
			marginTop: CV_STYLES.spacing.sectionBefore,
			marginBottom: CV_STYLES.spacing.sectionAfter,
			paddingBottom: 2,
			borderBottomWidth: 0.75,
			borderBottomColor: COLOR_HEADING,
			borderBottomStyle: "solid",
		},
		paragraph: {
			marginBottom: CV_STYLES.spacing.bulletAfter,
		},
		entryHeader: {
			marginTop: 4,
			marginBottom: 2,
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-end",
		},
		entryHeaderLeft: {
			flexDirection: "row",
			flexShrink: 1,
			flexWrap: "wrap",
		},
		entryHeaderMeta: {
			fontSize: CV_STYLES.fontSize.body,
			color: COLOR_MUTED,
			marginLeft: 8,
			flexShrink: 0,
		},
		entryTitle: {
			fontSize: CV_STYLES.fontSize.h3,
			fontWeight: "bold",
			color: COLOR_HEADING,
		},
		entrySubtitle: {
			fontSize: CV_STYLES.fontSize.h3,
			fontStyle: "italic",
			color: COLOR_TEXT,
		},
		entrySeparator: {
			fontSize: CV_STYLES.fontSize.h3,
			color: COLOR_MUTED,
		},
		bulletRow: {
			flexDirection: "row",
			marginBottom: CV_STYLES.spacing.bulletAfter,
			paddingLeft: 18,
		},
		bulletGlyph: {
			width: 10,
			marginLeft: -10,
		},
		bulletBody: {
			flex: 1,
		},
		skillCategory: {
			fontWeight: "bold",
			color: COLOR_HEADING,
		},
		hyperlink: {
			color: COLOR_ACCENT,
			textDecoration: "underline",
		},
	});
}

// ─── Inline emphasis renderer ────────────────────────────────────────────

interface EmphasisOpts {
	bold?: boolean;
	italic?: boolean;
	color?: string;
	fontSize?: number;
}

function EmphasisText({ text, opts = {} }: { text: string; opts?: EmphasisOpts }) {
	const tokens = parseInlineEmphasis(text);
	return (
		<>
			{tokens.map((t, i) => (
				<Text
					// biome-ignore lint/suspicious/noArrayIndexKey: render-once token list, never reordered
					key={`${i}-${t.text}`}
					style={{
						fontWeight: opts.bold || t.bold ? "bold" : "normal",
						fontStyle: opts.italic || t.italic ? "italic" : "normal",
						color: opts.color ?? COLOR_TEXT,
						fontSize: opts.fontSize ?? CV_STYLES.fontSize.body,
					}}
				>
					{t.text}
				</Text>
			))}
		</>
	);
}

// ─── Section components ──────────────────────────────────────────────────

function ContactLine({ header, styles }: { header: TailoredCvHeader; styles: ReturnType<typeof buildStyles> }) {
	const parts: React.ReactNode[] = [];
	const push = (node: React.ReactNode) => {
		if (parts.length > 0) {
			parts.push(
				<Text key={`sep-${parts.length}`} style={{ color: COLOR_MUTED }}>
					{"  •  "}
				</Text>,
			);
		}
		parts.push(node);
	};

	if (header.title) {
		push(
			<Text key="title" style={{ fontStyle: "italic", color: COLOR_MUTED }}>
				{header.title}
			</Text>,
		);
	}
	if (header.email) {
		push(
			<Link key="email" src={`mailto:${header.email}`} style={styles.hyperlink}>
				{header.email}
			</Link>,
		);
	}
	if (header.phone) push(<Text key="phone">{header.phone}</Text>);
	if (header.location) push(<Text key="loc">{header.location}</Text>);
	for (const [i, link] of header.links.entries()) {
		push(
			<Link key={`link-${i}-${link.url}`} src={link.url} style={styles.hyperlink}>
				{link.label ?? link.url}
			</Link>,
		);
	}

	if (parts.length === 0) return null;
	return <Text style={styles.contactLine}>{parts}</Text>;
}

function Bullet({ text, styles }: { text: string; styles: ReturnType<typeof buildStyles> }) {
	return (
		<View style={styles.bulletRow}>
			<Text style={styles.bulletGlyph}>•</Text>
			<Text style={styles.bulletBody}>
				<EmphasisText text={text} />
			</Text>
		</View>
	);
}

function formatDateRange(start?: string, end?: string): string {
	const s = start?.trim();
	const e = end?.trim();
	if (s && e) return `${s} – ${e}`;
	if (s) return s;
	if (e) return e;
	return "";
}

function formatExperienceDateRange(start?: string, end?: string): string {
	const s = start?.trim();
	const e = end?.trim();
	if (s && e) return `${s} – ${e}`;
	if (s) return `${s} – Present`;
	if (e) return e;
	return "";
}

function ExperienceEntry({ job, styles }: { job: TailoredCvExperience; styles: ReturnType<typeof buildStyles> }) {
	const dateRange = formatExperienceDateRange(job.start, job.end);
	const meta = [job.location, dateRange].filter(Boolean).join(" • ");
	return (
		// Outer wrap defaults to true so long bullet lists can paginate across
		// pages; the inner header stays intact via wrap={false} and is pulled to
		// the next page if there isn't room for it plus a first bullet (~36pt).
		<View>
			<View wrap={false} minPresenceAhead={36} style={styles.entryHeader}>
				<View style={styles.entryHeaderLeft}>
					<Text style={styles.entryTitle}>{job.company}</Text>
					{job.role ? (
						<>
							<Text style={styles.entrySeparator}>{"  —  "}</Text>
							<Text style={styles.entrySubtitle}>{job.role}</Text>
						</>
					) : null}
				</View>
				{meta ? <Text style={styles.entryHeaderMeta}>{meta}</Text> : null}
			</View>
			{job.bullets.map((b, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: render-once bullet list
				<Bullet key={`${i}-${b.slice(0, 24)}`} text={b} styles={styles} />
			))}
		</View>
	);
}

function EducationEntry({ edu, styles }: { edu: TailoredCvEducation; styles: ReturnType<typeof buildStyles> }) {
	const dateRange = formatDateRange(edu.start, edu.end);
	return (
		<View>
			<View wrap={false} minPresenceAhead={24} style={styles.entryHeader}>
				<View style={styles.entryHeaderLeft}>
					<Text style={styles.entryTitle}>{edu.school}</Text>
					{edu.degree ? <Text style={styles.entrySubtitle}>{` — ${edu.degree}`}</Text> : null}
				</View>
				{dateRange ? <Text style={styles.entryHeaderMeta}>{dateRange}</Text> : null}
			</View>
			{edu.details ? (
				<Text style={styles.paragraph}>
					<EmphasisText text={edu.details} />
				</Text>
			) : null}
		</View>
	);
}

function ProjectEntry({ project, styles }: { project: TailoredCvProject; styles: ReturnType<typeof buildStyles> }) {
	return (
		<View>
			<View wrap={false} minPresenceAhead={36} style={styles.entryHeader}>
				<View style={styles.entryHeaderLeft}>
					<Text style={styles.entryTitle}>{project.name}</Text>
					{project.url ? (
						<>
							<Text>{"  "}</Text>
							<Link src={project.url} style={styles.hyperlink}>
								{project.url}
							</Link>
						</>
					) : null}
				</View>
			</View>
			{project.description ? (
				<Text style={styles.paragraph}>
					<EmphasisText text={project.description} />
				</Text>
			) : null}
			{project.bullets.map((b, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: render-once bullet list
				<Bullet key={`${i}-${b.slice(0, 24)}`} text={b} styles={styles} />
			))}
		</View>
	);
}

function CertificationEntry({
	cert,
	styles,
}: {
	cert: TailoredCvCertification;
	styles: ReturnType<typeof buildStyles>;
}) {
	const meta = [cert.issuer, cert.date].filter(Boolean).join(" • ");
	return (
		<View style={styles.entryHeader}>
			<View style={styles.entryHeaderLeft}>
				<Text style={{ fontWeight: "bold", color: COLOR_HEADING }}>{cert.name}</Text>
			</View>
			{meta ? <Text style={styles.entryHeaderMeta}>{meta}</Text> : null}
		</View>
	);
}

function SkillRow({ group, styles }: { group: TailoredCvSkillGroup; styles: ReturnType<typeof buildStyles> }) {
	return (
		<Text style={styles.paragraph}>
			<Text style={styles.skillCategory}>{`${group.category}: `}</Text>
			<Text>{group.items.join(", ")}</Text>
		</Text>
	);
}

// ─── Document ────────────────────────────────────────────────────────────

export function CvDocument({ cv, title }: { cv: TailoredCv; title?: string }) {
	const family = registerFontsOnce();
	const styles = buildStyles(family);

	return (
		<Document title={title ?? "Tailored CV"}>
			<Page size="LETTER" style={styles.page}>
				<Text style={styles.nameHeading}>{cv.header.name}</Text>
				<ContactLine header={cv.header} styles={styles} />

				{cv.summary?.trim() ? (
					<>
						<Text style={styles.sectionHeading}>Summary</Text>
						<Text style={styles.paragraph}>
							<EmphasisText text={cv.summary.trim()} />
						</Text>
					</>
				) : null}

				{cv.skills.length > 0 ? (
					<>
						<Text style={styles.sectionHeading}>Skills</Text>
						{cv.skills.map((g, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: render-once skills list
						<SkillRow key={`${i}-${g.category}`} group={g} styles={styles} />
						))}
					</>
				) : null}

				{cv.experience.length > 0 ? (
					<>
						<Text style={styles.sectionHeading}>Experience</Text>
						{cv.experience.map((j, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: render-once experience list
						<ExperienceEntry key={`${i}-${j.company}`} job={j} styles={styles} />
						))}
					</>
				) : null}

				{cv.projects.length > 0 ? (
					<>
						<Text style={styles.sectionHeading}>Projects</Text>
						{cv.projects.map((p, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: render-once projects list
						<ProjectEntry key={`${i}-${p.name}`} project={p} styles={styles} />
						))}
					</>
				) : null}

				{cv.education.length > 0 ? (
					<>
						<Text style={styles.sectionHeading}>Education</Text>
						{cv.education.map((e, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: render-once education list
						<EducationEntry key={`${i}-${e.school}`} edu={e} styles={styles} />
						))}
					</>
				) : null}

				{cv.certifications.length > 0 ? (
					<>
						<Text style={styles.sectionHeading}>Certifications</Text>
						{cv.certifications.map((c, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: render-once certifications list
						<CertificationEntry key={`${i}-${c.name}`} cert={c} styles={styles} />
						))}
					</>
				) : null}
			</Page>
		</Document>
	);
}

export async function generateCvPdf(cv: TailoredCv, title?: string): Promise<Buffer> {
	return renderToBuffer(<CvDocument cv={cv} title={title} />);
}
