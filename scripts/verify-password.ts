
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Hardcoding for direct execution
const DATABASE_URL = "postgresql://postgres.rarebkglcabgsebbpjvu:Heroic@0784358@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL,
        },
    },
});

async function main() {
    const email = "heroicrwand@gmail.com";
    const newPassword = "password123";

    console.log(`Checking user ${email}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log("User not found!");
            return;
        }

        console.log("User found:", user.id);

        // Update password to known value
        console.log(`Resetting password to '${newPassword}'...`);
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        console.log("Password updated successfully!");

        // Verify it works
        const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
        const isValid = await bcrypt.compare(newPassword, updatedUser?.password || "");
        console.log(`Verification - Password '${newPassword}' is valid:`, isValid);

    } catch (err) {
        console.error("Database Error:", err);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
