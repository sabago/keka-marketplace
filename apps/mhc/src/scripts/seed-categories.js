const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.migrate' });

// Use the external connection string
const connectionUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
});

const newCategories = [
  { name: 'Clinical Forms & Templates', slug: 'clinical-forms-templates' },
  { name: 'Courses & Training Materials', slug: 'courses-training-materials' },
  { name: 'Compliance & Accreditation Tools', slug: 'compliance-accreditation-tools' },
  { name: 'Staffing & HR Resources', slug: 'staffing-hr-resources' },
  { name: 'Medical Equipment & Supplies', slug: 'medical-equipment-supplies' },
  { name: 'Vendor Services', slug: 'vendor-services' },
  { name: 'Marketing & Business Growth', slug: 'marketing-business-growth' },
  { name: 'Downloadables & Digital Tools', slug: 'downloadables-digital-tools' }
];

async function main() {
  try {    
    // Get all existing categories
    const existingCategories = await prisma.category.findMany();    
    // First, update all categories to have temporary slugs to avoid unique constraint errors    for (let i = 0; i < existingCategories.length; i++) {
      await prisma.category.update({
        where: { id: existingCategories[i].id },
        data: {
          slug: `temp-slug-${i}-${Date.now()}`
        }
      });
    }
    
    // Now update categories with their final values
    for (let i = 0; i < existingCategories.length; i++) {
      if (i < newCategories.length) {
        // Update existing category with new name and slug
        await prisma.category.update({
          where: { id: existingCategories[i].id },
          data: {
            name: newCategories[i].name,
            slug: newCategories[i].slug
          }
        });
        
        // Mark as processed
        newCategories[i].processed = true;
      } else {
      // For extra categories, rename them to hide them
      await prisma.category.update({
        where: { id: existingCategories[i].id },
        data: {
          name: `Hidden Category ${i}`,
          slug: `hidden-${i}`
        }
      });
        }
    }
    
    // Create any remaining new categories
    const remainingCategories = newCategories.filter(c => !c.processed);
    if (remainingCategories.length > 0) {
      for (const category of remainingCategories) {
        await prisma.category.create({
          data: {
            name: category.name,
            slug: category.slug
          }
        });
      }
    }
  } catch (error) {
    console.error('Error updating categories:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
