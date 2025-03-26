const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  { name: 'Business', slug: 'business' },
  { name: 'Education', slug: 'education' },
  { name: 'Design', slug: 'design' },
  { name: 'Technology', slug: 'technology' },
  { name: 'Marketing', slug: 'marketing' },
  { name: 'Finance', slug: 'finance' },
];

async function main() {
  console.log('Seeding categories...');
  
  for (const category of categories) {
    // Check if category already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug: category.slug },
    });
    
    if (!existingCategory) {
      await prisma.category.create({
        data: category,
      });
      console.log(`Created category: ${category.name}`);
    } else {
      console.log(`Category already exists: ${category.name}`);
    }
  }
  
  console.log('Categories seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
