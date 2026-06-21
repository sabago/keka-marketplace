import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function createPlatformAdmin() {
	try {
		// Admin credentials
		const email = "scasey@ugabot.com";
		const name = "Sandra Casey";
		const password = "Admin123!"; // Change this after first login

		console.log("\n🔐 Creating platform administrator...\n");

		// Check if admin already exists
		const existingUser = await prisma.user.findUnique({
			where: { email: email.toLowerCase() },
		});

		if (existingUser) {
			console.log("❌ Admin user already exists with this email");
			process.exit(1);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 12);

		// Create admin user
		const user = await prisma.user.create({
			data: {
				email: email.toLowerCase(),
				name,
				password: hashedPassword,
				role: UserRole.PLATFORM_ADMIN,
				agencyId: null,
				emailVerified: new Date(),
			},
		});

		console.log("✅ Platform admin created successfully!\n");
		console.log("📧 Email:    ", email);
		console.log("🔑 Password: ", password);
		console.log("⚠️  Please change your password after first login\n");
		console.log("🔗 Login at: http://localhost:3000/auth/signin\n");
	} catch (error) {
		console.error("❌ Error creating platform admin:", error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

createPlatformAdmin();
