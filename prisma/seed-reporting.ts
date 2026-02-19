import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding reporting configuration...');

    // Create a strategic priority with categories and questions
    const priority = await prisma.strategicPriority.create({
        data: {
            name: 'Empowering students to witness to the good news of Jesus Christ',
            description: 'Focus on evangelism and discipleship activities',
            categories: {
                create: [
                    {
                        name: 'Activities for Empowering students to witness to the good news of Jesus Christ',
                        templates: {
                            create: [
                                { name: 'Training on Friendship evangelism' },
                                { name: 'Expository preaching' },
                            ],
                        },
                    },
                ],
            },
            questions: {
                create: [
                    {
                        statement: 'How well are students equipped to share their faith?',
                    },
                    {
                        statement: 'To what extent are evangelistic activities integrated into regular programming?',
                    },
                ],
            },
        },
    });

    console.log('Created priority:', priority);
    console.log('Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
