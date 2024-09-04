const { PrismaClient } = require("@prisma/client");

const database = new PrismaClient;

async function main() {

  try {
    await database.category.createMany({
      data: [
        { name: "Electrical Engineering" },
        { name: "Music" },
        { name: "Computer Science" },
        { name: "Accounting" },
        { name: "Fitness" },
        { name: "Filming" },
        { name: "Photography" }
      ]
    });

    console.log("Succes");

  } catch (error) {
    console.log("Error seeding the database categories", error);
  } finally {
    await database.$disconnect();
  }

}

main();