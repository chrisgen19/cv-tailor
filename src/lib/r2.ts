import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
	region: "auto",
	endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
	credentials: {
		accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
		secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
	},
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

export async function getPresignedUploadUrl(key: string, contentType: string) {
	const command = new PutObjectCommand({
		Bucket: BUCKET,
		Key: key,
		ContentType: contentType,
	});
	const url = await getSignedUrl(r2, command, { expiresIn: 600 });
	return url;
}

export async function getFileFromR2(key: string) {
	const command = new GetObjectCommand({
		Bucket: BUCKET,
		Key: key,
	});
	const response = await r2.send(command);
	const bytes = await response.Body?.transformToByteArray();
	if (!bytes) throw new Error("Failed to read file from R2");
	return Buffer.from(bytes);
}

export async function deleteFileFromR2(key: string) {
	const command = new DeleteObjectCommand({
		Bucket: BUCKET,
		Key: key,
	});
	await r2.send(command);
}

export function getR2PublicUrl(key: string) {
	return `${process.env.CLOUDFLARE_R2_ENDPOINT}/${BUCKET}/${key}`;
}
