/**
 * Synthetic fixtures for the Gemini model eval harness.
 *
 * 5 master CVs × 5 JDs = 25 tailor runs per candidate model.
 * Each JD lists `hardSkills` used for both:
 *   - synthesizing a deterministic MatchAnalysis (so eval results don't depend
 *     on a separate analyzeMatch call that varies per model), and
 *   - automated keyword-coverage scoring against the tailored output.
 *
 * Fixtures are intentionally short (~200 words) to keep eval cost bounded.
 * Replace with real anonymized CVs/JDs for higher-fidelity runs.
 */

export interface CvFixture {
	id: string;
	role: string;
	/** Years of professional experience evident in the CV. Drives the 550 vs 950 word budget per TAILOR_SYSTEM_INSTRUCTION RULE 2. */
	yearsOfExperience: number;
	text: string;
}

export interface JdFixture {
	id: string;
	title: string;
	text: string;
	hardSkills: string[];
}

export const CV_FIXTURES: CvFixture[] = [
	{
		id: "cv-01-senior-fullstack",
		role: "Senior Full-Stack Engineer (Node/React)",
		yearsOfExperience: 10,
		text: `Maria Chen
maria.chen@example.com | +1-555-0101 | San Francisco, CA
linkedin.com/in/mariachen | github.com/mariachen

SUMMARY
Senior full-stack engineer with 10 years building consumer SaaS on Node.js, TypeScript, React, and PostgreSQL. Led platform migrations and shipped revenue-driving features used by 1M+ MAU.

EXPERIENCE
Lumen Labs — Staff Engineer (2021–Present)
- Led migration from REST monolith to GraphQL federation across 12 services, reducing p95 latency 40%.
- Architected real-time collaboration layer in TypeScript using WebSockets and Redis Streams; supports 50k concurrent rooms.
- Mentored 6 engineers; ran weekly system design reviews.

Brightcart — Senior Engineer (2018–2021)
- Built React/Next.js storefront serving 800k MAU; cut LCP from 4.2s to 1.6s with edge caching and code splitting.
- Migrated checkout from MongoDB to PostgreSQL; reduced order-write errors 95%.
- Owned Stripe integration (subscriptions, refunds, disputes).

Acme Web — Engineer (2016–2018)
- Shipped marketing site and CMS in React + GraphQL; cut publish latency from 12s to 800ms.

EDUCATION
B.S. Computer Science, UC Davis (2016)

SKILLS
Languages: TypeScript, JavaScript, Go, SQL
Frontend: React, Next.js, Redux, Tailwind
Backend: Node.js, GraphQL, REST, PostgreSQL, Redis
Cloud: AWS (ECS, Lambda, RDS), Docker, Terraform`,
	},
	{
		id: "cv-02-mid-data-scientist",
		role: "Mid-Level Data Scientist (Python/ML)",
		yearsOfExperience: 4,
		text: `Jamal Roberts
jamal.roberts@example.com | +1-555-0202 | Austin, TX
linkedin.com/in/jamalroberts

SUMMARY
Data scientist with 4 years in NLP and recommender systems. Comfortable shipping models end-to-end from notebook to production inference service.

EXPERIENCE
Polyglot AI — Data Scientist (2022–Present)
- Built BERT-based intent classifier for support tickets; raised top-1 accuracy from 72% to 89%.
- Productionized model with FastAPI + Docker on AWS SageMaker; serves 2M requests/day at p95 < 120ms.
- Owned weekly A/B experiments and stat-sig analysis in Python (statsmodels, scipy).

Northwind Retail — Junior Data Scientist (2020–2022)
- Built collaborative-filtering recommender lifting click-through 18%.
- Wrote Airflow DAGs for daily feature pipelines on Snowflake.

EDUCATION
M.S. Statistics, UT Austin (2020)
B.S. Mathematics, Rice University (2018)

SKILLS
Languages: Python, SQL, R
ML: PyTorch, scikit-learn, Hugging Face Transformers, XGBoost
Data: Snowflake, Airflow, dbt, Pandas
Cloud: AWS SageMaker, S3, Lambda
Other: Git, Docker, FastAPI`,
	},
	{
		id: "cv-03-junior-frontend",
		role: "Junior Frontend Developer (Vue)",
		yearsOfExperience: 2,
		text: `Priya Singh
priya.singh@example.com | +44-20-5550-0303 | London, UK
linkedin.com/in/priyasingh

SUMMARY
Frontend developer with 2 years building accessible, responsive web apps in Vue 3 and TypeScript. Strong eye for design systems and CSS architecture.

EXPERIENCE
GreenLeaf Studio — Frontend Developer (2023–Present)
- Built Vue 3 + Pinia dashboard for sustainability reporting; shipped to 30 enterprise clients.
- Implemented design system in Storybook with 40+ accessible components meeting WCAG 2.1 AA.
- Reduced bundle size 35% via route-level code splitting and tree-shaking audit.

Bright Pixel Agency — Junior Developer (2022–2023)
- Built marketing landing pages in Nuxt; collaborated daily with designers in Figma.
- Wrote unit tests in Vitest; raised coverage from 20% to 75%.

EDUCATION
B.A. Digital Media, University of the Arts London (2022)

SKILLS
Languages: TypeScript, JavaScript, HTML, CSS, SCSS
Frontend: Vue 3, Nuxt, Pinia, Tailwind, Storybook
Tooling: Vite, Vitest, Cypress, Figma
Other: Git, accessibility (WCAG), responsive design`,
	},
	{
		id: "cv-04-devops",
		role: "DevOps Engineer (AWS/Kubernetes)",
		yearsOfExperience: 7,
		text: `Tomás Álvarez
tomas.alvarez@example.com | +34-91-555-0404 | Madrid, Spain
linkedin.com/in/tomasalvarez

SUMMARY
DevOps engineer with 7 years operating large Kubernetes fleets on AWS. Deep experience in IaC, observability, and incident response.

EXPERIENCE
Cumulus Bank — Senior DevOps Engineer (2021–Present)
- Operate 14 EKS clusters across 3 regions hosting 200+ microservices; maintained 99.97% SLO.
- Migrated config from Helm to Argo CD; reduced deploy lead time from 45min to 6min.
- Authored Terraform modules adopted by 8 product teams.
- On-call lead; cut MTTR from 38min to 11min via runbook standardization.

Iberdata — DevOps Engineer (2018–2021)
- Built CI/CD on GitLab + Kaniko; ran 4k builds/day.
- Migrated VM workloads to Kubernetes on AWS; cut infra cost 28%.

EDUCATION
B.Eng. Computer Engineering, UPM Madrid (2017)

SKILLS
Cloud: AWS (EKS, EC2, RDS, IAM, VPC), Kubernetes, Helm, Argo CD
IaC: Terraform, Ansible, Packer
Observability: Prometheus, Grafana, Loki, OpenTelemetry, PagerDuty
CI/CD: GitLab CI, GitHub Actions, Jenkins
Languages: Go, Python, Bash`,
	},
	{
		id: "cv-05-designer-coder",
		role: "Product Designer with Frontend Skills",
		yearsOfExperience: 5,
		text: `Yuki Tanaka
yuki.tanaka@example.com | +81-3-5555-0505 | Tokyo, Japan
linkedin.com/in/yukitanaka | dribbble.com/yukitanaka

SUMMARY
Product designer with 5 years across B2B SaaS and consumer mobile. Comfortable shipping production React components alongside high-fidelity Figma work.

EXPERIENCE
Sora Health — Senior Product Designer (2022–Present)
- Led redesign of patient-onboarding flow; raised completion rate from 54% to 78%.
- Authored design system in Figma + React (Radix primitives, Tailwind); 60+ components shared across 4 products.
- Pair-shipped React components with engineers; merged 30+ PRs to production app.

Kotone Mobile — Product Designer (2020–2022)
- Designed iOS and Android screens for a 2M-MAU lifestyle app.
- Ran weekly user-research interviews; synthesized insights into roadmap.

EDUCATION
B.Des. Interaction Design, Musashino Art University (2019)

SKILLS
Design: Figma, FigJam, Sketch, Principle, prototyping, design systems
Frontend: React, TypeScript, Tailwind, Radix UI, Storybook
Research: usability testing, contextual inquiry, journey mapping
Other: accessibility (WCAG), Git, Linear`,
	},
];

export const JD_FIXTURES: JdFixture[] = [
	{
		id: "jd-01-react-lead",
		title: "Engineering Lead — React Platform",
		hardSkills: [
			"React",
			"TypeScript",
			"Next.js",
			"GraphQL",
			"Node.js",
			"AWS",
			"PostgreSQL",
			"system design",
		],
		text: `Engineering Lead — React Platform
We are seeking an Engineering Lead to own our React/Next.js web platform serving 2M+ users. You will set technical direction, mentor 5–8 engineers, and partner with product and design.

Responsibilities
- Lead architecture decisions for the customer-facing web platform.
- Drive performance, reliability, and accessibility (WCAG 2.1 AA).
- Own the GraphQL gateway and contribute to backend Node.js services.
- Mentor engineers; run system-design and code reviews.

Requirements
- 7+ years building production React applications, 2+ years in a tech-lead capacity.
- Strong TypeScript and Next.js experience.
- Experience operating Node.js services and a GraphQL layer at scale.
- Working knowledge of AWS (ECS or Lambda, RDS) and PostgreSQL.
- Track record of system-design ownership for user-facing products.

Nice to have
- Experience with edge runtimes, real-time/WebSocket workloads, or design-system stewardship.`,
	},
	{
		id: "jd-02-ml-nlp",
		title: "Machine Learning Engineer — NLP",
		hardSkills: [
			"Python",
			"PyTorch",
			"Transformers",
			"NLP",
			"FastAPI",
			"AWS SageMaker",
			"Docker",
			"A/B testing",
		],
		text: `Machine Learning Engineer — NLP
Join our applied ML team to ship NLP models powering customer-support automation across 12 languages.

Responsibilities
- Train and fine-tune transformer models (BERT, DeBERTa, Llama) on proprietary support data.
- Productionize models with FastAPI and Docker on AWS SageMaker.
- Run A/B tests; partner with product on metric design and stat-sig analysis.
- Own model monitoring and drift detection.

Requirements
- 3+ years shipping ML models in production.
- Strong Python; daily PyTorch and Hugging Face Transformers experience.
- Experience deploying inference services with FastAPI + Docker.
- Familiar with AWS SageMaker (or equivalent: Vertex AI, Azure ML).
- Comfortable running A/B tests and reading experiment results.

Nice to have
- LLM fine-tuning (LoRA, QLoRA) and RAG architectures.
- Multilingual NLP experience.`,
	},
	{
		id: "jd-03-frontend-react",
		title: "Frontend Engineer — React",
		hardSkills: [
			"React",
			"TypeScript",
			"Tailwind",
			"accessibility",
			"design systems",
			"Storybook",
			"Vite",
			"testing",
		],
		text: `Frontend Engineer — React
We are hiring a frontend engineer to build accessible, design-system-driven UI for our B2B analytics product.

Responsibilities
- Build new product surfaces in React + TypeScript with our Tailwind-based design system.
- Maintain and expand the component library in Storybook.
- Champion accessibility (WCAG 2.1 AA) and visual quality.
- Write unit and integration tests; review peer PRs.

Requirements
- 2+ years building production React apps with TypeScript.
- Strong CSS and Tailwind fundamentals.
- Experience contributing to or maintaining a design system.
- Familiarity with Storybook, Vite, and a modern testing stack (Vitest, Jest, or Playwright).
- Care for accessibility — you read WCAG, not just lint rules.

Nice to have
- Prior Vue or Svelte experience.
- Experience with design tokens or theming systems.`,
	},
	{
		id: "jd-04-cloud-platform",
		title: "Cloud Platform Engineer",
		hardSkills: [
			"Kubernetes",
			"AWS",
			"Terraform",
			"Helm",
			"Argo CD",
			"Prometheus",
			"Grafana",
			"CI/CD",
		],
		text: `Cloud Platform Engineer
Our platform team operates the multi-region Kubernetes fleet powering all of our products.

Responsibilities
- Operate and improve EKS clusters across multiple regions.
- Author and review Terraform modules used by product teams.
- Own CI/CD pipelines (GitHub Actions / Argo CD) and the deploy story.
- Maintain Prometheus + Grafana observability stack and alert routing.
- Participate in on-call rotation; lead incident retrospectives.

Requirements
- 5+ years in DevOps or Platform Engineering roles.
- Production experience operating Kubernetes (preferably EKS).
- Strong Terraform; you have written reusable modules adopted by other teams.
- Comfortable with Helm, Argo CD, and GitOps workflows.
- Solid AWS fundamentals (VPC, IAM, RDS, EC2).
- Experience with Prometheus, Grafana, and incident response.

Nice to have
- Go or Python for tooling.
- OpenTelemetry rollout experience.`,
	},
	{
		id: "jd-05-fullstack-ts",
		title: "Full-Stack Engineer — TypeScript",
		hardSkills: [
			"TypeScript",
			"React",
			"Next.js",
			"Node.js",
			"PostgreSQL",
			"Prisma",
			"REST",
			"AWS",
		],
		text: `Full-Stack Engineer — TypeScript
Help us build the next generation of our healthcare scheduling product. You will own features end-to-end across our TypeScript stack.

Responsibilities
- Build features across the Next.js frontend and Node.js API layer.
- Model data with Prisma + PostgreSQL; design REST endpoints.
- Collaborate with product and design from spec through ship.
- Write unit, integration, and end-to-end tests.

Requirements
- 4+ years professional TypeScript experience.
- Strong React and Next.js (App Router preferred).
- Comfortable in Node.js services and SQL (PostgreSQL).
- Experience with Prisma or a comparable ORM.
- Familiar with REST API design and AWS basics (Lambda, S3, RDS).

Nice to have
- HIPAA-aware engineering or healthcare-domain experience.
- Tailwind CSS, React Hook Form, Zod.`,
	},
];
