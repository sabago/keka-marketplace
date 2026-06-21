const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Find the Business category
  const category = await prisma.category.findUnique({
    where: {
      slug: 'business',
    },
  })
  
  if (!category) {
    console.error('Business category not found. Please run seed-categories.js first.');
    return;
  }
  
  // Create a product
  const product = await prisma.product.create({
    data: {
      title: 'Business Plan Template',
      description: 'A comprehensive business plan template...',
      price: 29.99,
      filePath: 'dummy-path/business-plan.pdf',
      thumbnail: 'https://placehold.co/600x400/e2e8f0/1e293b?text=Business+Plan',
      categories: {
        create: [
          {
            category: {
              connect: { id: category.id }
            }
          }
        ]
      }
    },
  })

}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
